document.addEventListener("DOMContentLoaded", () => {
  const adminToken = localStorage.getItem("adminToken");
  const adminUser = localStorage.getItem("adminUser")
    ? JSON.parse(localStorage.getItem("adminUser"))
    : null;

  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  // Elements
  const createTenantForm = document.getElementById("createTenantForm");
  const createStatus = document.getElementById("createStatus");
  const tenantsLoading = document.getElementById("tenantsLoading");
  const tenantsList = document.getElementById("tenantsList");
  const noTenants = document.getElementById("noTenants");
  const loadError = document.getElementById("loadError");
  const tenantsTableBody = document.getElementById("tenantsTableBody");
  const retryButton = document.getElementById("retryButton");
  const adminNameElement = document.getElementById("adminName");
  const logoutButton = document.getElementById("logoutButton");
  const searchInput = document.getElementById("searchTenant");
  const refreshButton = document.getElementById("refreshTenantsButton");

  if (adminNameElement && adminUser) {
    adminNameElement.textContent = adminUser.name || "Admin";
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/admin-login.html";
    });
  }

  loadTenants();

  createTenantForm.addEventListener("submit", handleCreateTenant);
  retryButton.addEventListener("click", loadTenants);
  searchInput.addEventListener("input", filterTenants);
  refreshButton.addEventListener("click", loadTenants);

  setupModalEventListeners();

  function loadTenants() {
    tenantsLoading.classList.remove("hidden");
    tenantsList.classList.add("hidden");
    noTenants.classList.add("hidden");
    loadError.classList.add("hidden");

    fetch("/api/tenants", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            window.location.href = "/admin-login.html";
            throw new Error("Session expired. Please login again.");
          }
          throw new Error("Error loading tenants");
        }
        return response.json();
      })
      .then((tenants) => {
        tenantsLoading.classList.add("hidden");

        if (tenants.length === 0) {
          noTenants.classList.remove("hidden");
          return;
        }

        tenantsList.classList.remove("hidden");

        tenantsTableBody.innerHTML = "";

        tenants.forEach((tenant) => {
          const row = document.createElement("tr");

          const createdAt = new Date(tenant.created_at);
          const formattedDate = createdAt.toLocaleDateString("pt-BR");

          row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                            <div class="text-sm leading-5 font-medium text-gray-900">${tenant.name}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                            <div class="text-sm leading-5 text-gray-500">
                                <a href="http://${tenant.subdomain}.${window.location.hostname}" target="_blank" 
                                class="text-purple-600 hover:text-purple-900">
                                    ${tenant.subdomain}
                                </a>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full status-${tenant.status}">
                                ${tenant.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                            ${formattedDate}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right border-b border-gray-200 text-sm leading-5 font-medium">
                            <button class="text-indigo-600 hover:text-indigo-900 mr-3" onclick="viewTenantDetails(${tenant.id})">
                                Detalhes
                            </button>
                            <button class="text-purple-600 hover:text-purple-900 mr-3" onclick="showEditTenantModal(${tenant.id})">
                                Editar
                            </button>
                            <button class="text-red-600 hover:text-red-900" onclick="showDeleteConfirmation(${tenant.id}, '${tenant.name}')">
                                Excluir
                            </button>
                        </td>
                    `;

          tenantsTableBody.appendChild(row);
        });
      })
      .catch((error) => {
        console.error("Error loading tenants:", error);
        tenantsLoading.classList.add("hidden");
        loadError.classList.remove("hidden");
      });
  }

  function filterTenants() {
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll("#tenantsTableBody tr");

    rows.forEach((row) => {
      const name = row
        .querySelector("td:first-child")
        .textContent.toLowerCase();
      const subdomain = row
        .querySelector("td:nth-child(2)")
        .textContent.toLowerCase();

      if (name.includes(searchTerm) || subdomain.includes(searchTerm)) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    });

    const visibleRows = document.querySelectorAll(
      "#tenantsTableBody tr:not(.hidden)"
    );
    if (visibleRows.length === 0 && searchTerm !== "") {
      noTenants.classList.remove("hidden");
      noTenants.querySelector(
        "p:first-child"
      ).textContent = `Nenhum tenant encontrado para "${searchTerm}".`;
      noTenants.querySelector("p:last-child").textContent =
        "Tente outro termo de busca.";
    } else {
      noTenants.classList.add("hidden");
    }
  }

  function handleCreateTenant(event) {
    event.preventDefault();

    const name = document.getElementById("tenantName").value;
    const subdomain = document.getElementById("tenantSubdomain").value;
    const adminId = document.getElementById("adminId").value;

    const adminUser = {
      firstName: document.getElementById("adminFirstName").value,
      lastName: document.getElementById("adminLastName").value,
      email: document.getElementById("adminEmail").value,
      password: document.getElementById("adminPassword").value,
    };

    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      showCreateStatus(
        "O subdomínio deve conter apenas letras minúsculas, números e hífens",
        false
      );
      return;
    }

    if (adminUser.password.length < 6) {
      showCreateStatus("A senha deve ter pelo menos 6 caracteres", false);
      return;
    }

    const tenantData = {
      name,
      subdomain,
      adminId,
      adminUser,
    };

    const submitButton = createTenantForm.querySelector(
      'button[type="submit"]'
    );
    submitButton.disabled = true;
    submitButton.textContent = "Criando...";

    fetch("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(tenantData),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            window.location.href = "/admin-login.html";
            throw new Error("Session expired. Please login again.");
          }

          return response.json().then((data) => {
            throw new Error(data.error || "Erro ao criar tenant");
          });
        }
        return response.json();
      })
      .then((data) => {
        showCreateStatus(data.message, true);

        createTenantForm.reset();

        loadTenants();
      })
      .catch((error) => {
        showCreateStatus(error.message, false);
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Criar Tenant";
      });
  }

  function showCreateStatus(message, isSuccess) {
    createStatus.textContent = message;
    createStatus.classList.remove(
      "hidden",
      "bg-green-100",
      "text-green-800",
      "bg-red-100",
      "text-red-800"
    );

    if (isSuccess) {
      createStatus.classList.add("bg-green-100", "text-green-800");
    } else {
      createStatus.classList.add("bg-red-100", "text-red-800");
    }

    setTimeout(() => {
      createStatus.classList.add("hidden");
    }, 5000);
  }

  function setupModalEventListeners() {
    document
      .getElementById("editTenantForm")
      .addEventListener("submit", handleEditTenant);
    document
      .getElementById("cancelEditButton")
      .addEventListener("click", () => {
        document.getElementById("editTenantModal").classList.add("hidden");
      });

    document
      .getElementById("closeTenantDetailsButton")
      .addEventListener("click", () => {
        document.getElementById("tenantDetailsModal").classList.add("hidden");
      });
    document
      .getElementById("tenantDetailsCloseButton")
      .addEventListener("click", () => {
        document.getElementById("tenantDetailsModal").classList.add("hidden");
      });

    document
      .getElementById("cancelDeleteButton")
      .addEventListener("click", () => {
        document.getElementById("confirmDeleteModal").classList.add("hidden");
      });
    document
      .getElementById("confirmDeleteButton")
      .addEventListener("click", () => {
        const modal = document.getElementById("confirmDeleteModal");
        const tenantId = modal.dataset.tenantId;
        const tenantName =
          document.getElementById("deleteTenantName").textContent;

        modal.classList.add("hidden");
        deleteTenant(tenantId, tenantName);
      });
  }

  function handleEditTenant(event) {
    event.preventDefault();

    const tenantId = document.getElementById("editTenantId").value;
    const name = document.getElementById("editTenantName").value;
    const status = document.getElementById("editTenantStatus").value;

    if (!name || !status) {
      const editStatus = document.getElementById("editStatus");
      editStatus.textContent = "Nome e status são obrigatórios";
      editStatus.classList.remove(
        "hidden",
        "bg-blue-100",
        "text-blue-800",
        "bg-green-100",
        "text-green-800"
      );
      editStatus.classList.add("bg-red-100", "text-red-800");
      return;
    }

    const submitButton = document.querySelector(
      '#editTenantForm button[type="submit"]'
    );
    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";

    const editStatus = document.getElementById("editStatus");
    editStatus.textContent = "Atualizando tenant...";
    editStatus.classList.remove(
      "hidden",
      "bg-red-100",
      "text-red-800",
      "bg-green-100",
      "text-green-800"
    );
    editStatus.classList.add("bg-blue-100", "text-blue-800");

    fetch(`/api/tenants/${tenantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, status }),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            window.location.href = "/admin-login.html";
            throw new Error("Session expired. Please login again.");
          }
          return response.json().then((data) => {
            throw new Error(data.error || "Erro ao atualizar tenant");
          });
        }
        return response.json();
      })
      .then((data) => {
        editStatus.textContent = "Tenant atualizado com sucesso!";
        editStatus.classList.remove(
          "bg-blue-100",
          "text-blue-800",
          "bg-red-100",
          "text-red-800"
        );
        editStatus.classList.add("bg-green-100", "text-green-800");

        setTimeout(() => {
          document.getElementById("editTenantModal").classList.add("hidden");
          loadTenants();
        }, 1500);
      })
      .catch((error) => {
        editStatus.textContent = error.message;
        editStatus.classList.remove(
          "bg-blue-100",
          "text-blue-800",
          "bg-green-100",
          "text-green-800"
        );
        editStatus.classList.add("bg-red-100", "text-red-800");
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Salvar Alterações";
      });
  }
});

function showEditTenantModal(tenantId) {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  const editStatus = document.getElementById("editStatus");
  editStatus.textContent = "Carregando dados do tenant...";
  editStatus.classList.remove(
    "hidden",
    "bg-red-100",
    "text-red-800",
    "bg-green-100",
    "text-green-800"
  );
  editStatus.classList.add("bg-blue-100", "text-blue-800");

  fetch(`/api/tenants/${tenantId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          window.location.href = "/admin-login.html";
          throw new Error("Session expired. Please login again.");
        }
        throw new Error("Error fetching tenant data");
      }
      return response.json();
    })
    .then((tenant) => {
      editStatus.classList.add("hidden");

      document.getElementById("editTenantId").value = tenant.id;
      document.getElementById("editTenantName").value = tenant.name;
      document.getElementById("editTenantStatus").value =
        tenant.status || "active";

      document.getElementById("editTenantModal").classList.remove("hidden");
    })
    .catch((error) => {
      editStatus.textContent = error.message;
      editStatus.classList.remove(
        "bg-blue-100",
        "text-blue-800",
        "bg-green-100",
        "text-green-800"
      );
      editStatus.classList.add("bg-red-100", "text-red-800");

      setTimeout(() => {
        editStatus.classList.add("hidden");
      }, 3000);
    });
}

function showDeleteConfirmation(tenantId, tenantName) {
  const modal = document.getElementById("confirmDeleteModal");
  modal.dataset.tenantId = tenantId;
  document.getElementById("deleteTenantName").textContent = tenantName;
  modal.classList.remove("hidden");
}

function deleteTenant(tenantId, tenantName) {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  const createStatus = document.getElementById("createStatus");
  createStatus.textContent = `Excluindo tenant "${tenantName}"...`;
  createStatus.classList.remove(
    "hidden",
    "bg-green-100",
    "text-green-800",
    "bg-red-100",
    "text-red-800"
  );
  createStatus.classList.add("bg-blue-100", "text-blue-800");

  fetch(`/api/tenants/${tenantId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          window.location.href = "/admin-login.html";
          throw new Error("Session expired. Please login again.");
        }
        return response.json().then((data) => {
          throw new Error(data.error || "Erro ao excluir tenant");
        });
      }
      return response.json();
    })
    .then((data) => {
      createStatus.textContent = `Tenant "${tenantName}" excluído com sucesso!`;
      createStatus.classList.remove(
        "bg-blue-100",
        "text-blue-800",
        "bg-red-100",
        "text-red-800"
      );
      createStatus.classList.add("bg-green-100", "text-green-800");

      loadTenants();

      setTimeout(() => {
        createStatus.classList.add("hidden");
      }, 3000);
    })
    .catch((error) => {
      createStatus.textContent = error.message;
      createStatus.classList.remove(
        "bg-blue-100",
        "text-blue-800",
        "bg-green-100",
        "text-green-800"
      );
      createStatus.classList.add("bg-red-100", "text-red-800");

      setTimeout(() => {
        createStatus.classList.add("hidden");
      }, 5000);
    });
}

function viewTenantDetails(tenantId) {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  const detailsContent = document.getElementById("tenantDetailsContent");
  detailsContent.innerHTML =
    '<p class="text-center">Carregando detalhes...</p>';

  document.getElementById("tenantDetailsModal").classList.remove("hidden");

  fetch(`/api/tenants/${tenantId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          window.location.href = "/admin-login.html";
          throw new Error("Session expired. Please login again.");
        }
        throw new Error("Error fetching tenant details");
      }
      return response.json();
    })
    .then((tenant) => {
      const createdAt = new Date(tenant.created_at).toLocaleString("pt-BR");
      const updatedAt = tenant.updated_at
        ? new Date(tenant.updated_at).toLocaleString("pt-BR")
        : "N/A";

      detailsContent.innerHTML = `
            <div class="grid grid-cols-1 gap-4">
                <div class="border-b pb-2">
                    <h3 class="text-lg font-medium text-gray-700">Informações Básicas</h3>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500">ID</p>
                        <p class="font-medium">${tenant.id}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Nome</p>
                        <p class="font-medium">${tenant.name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Subdomínio</p>
                        <p class="font-medium">${tenant.subdomain}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Schema</p>
                        <p class="font-medium">${tenant.schema_name}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Status</p>
                        <p class="font-medium">
                            <span class="px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full status-${tenant.status}">
                                ${tenant.status}
                            </span>
                        </p>
                    </div>
                </div>
                
                <div class="border-b pb-2 mt-4">
                    <h3 class="text-lg font-medium text-gray-700">Datas</h3>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500">Criado em</p>
                        <p class="font-medium">${createdAt}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Atualizado em</p>
                        <p class="font-medium">${updatedAt}</p>
                    </div>
                </div>
                
                <div class="border-b pb-2 mt-4">
                    <h3 class="text-lg font-medium text-gray-700">Acesso</h3>
                </div>
                <div>
                    <p class="text-sm text-gray-500">URL de Acesso</p>
                    <p class="font-medium">
                        <a href="http://${tenant.subdomain}.${window.location.hostname}" target="_blank" 
                           class="text-purple-600 hover:text-purple-900">
                            ${tenant.subdomain}.${window.location.hostname}
                        </a>
                    </p>
                </div>
            </div>
        `;
    })
    .catch((error) => {
      detailsContent.innerHTML = `
            <div class="bg-red-100 text-red-800 p-4 rounded">
                <p class="font-medium">Erro ao carregar detalhes</p>
                <p>${error.message}</p>
            </div>
        `;
    });
}

function loadTenants() {
  document.getElementById("tenantsLoading").classList.remove("hidden");
  document.getElementById("tenantsList").classList.add("hidden");
  document.getElementById("noTenants").classList.add("hidden");
  document.getElementById("loadError").classList.add("hidden");

  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  fetch("/api/tenants", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          window.location.href = "/admin-login.html";
          throw new Error("Session expired. Please login again.");
        }
        throw new Error("Error loading tenants");
      }
      return response.json();
    })
    .then((tenants) => {
      document.getElementById("tenantsLoading").classList.add("hidden");

      if (tenants.length === 0) {
        document.getElementById("noTenants").classList.remove("hidden");
        return;
      }

      document.getElementById("tenantsList").classList.remove("hidden");

      const tenantsTableBody = document.getElementById("tenantsTableBody");
      tenantsTableBody.innerHTML = "";

      tenants.forEach((tenant) => {
        const row = document.createElement("tr");

        const createdAt = new Date(tenant.created_at);
        const formattedDate = createdAt.toLocaleDateString("pt-BR");

        row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                        <div class="text-sm leading-5 font-medium text-gray-900">${tenant.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                        <div class="text-sm leading-5 text-gray-500">
                            <a href="http://${tenant.subdomain}.${window.location.hostname}" target="_blank" 
                            class="text-purple-600 hover:text-purple-900">
                                ${tenant.subdomain}
                            </a>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200">
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full status-${tenant.status}">
                            ${tenant.status}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap border-b border-gray-200 text-sm leading-5 text-gray-500">
                        ${formattedDate}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right border-b border-gray-200 text-sm leading-5 font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 mr-3" onclick="viewTenantDetails(${tenant.id})">
                            Detalhes
                        </button>
                        <button class="text-purple-600 hover:text-purple-900 mr-3" onclick="showEditTenantModal(${tenant.id})">
                            Editar
                        </button>
                        <button class="text-red-600 hover:text-red-900" onclick="showDeleteConfirmation(${tenant.id}, '${tenant.name}')">
                            Excluir
                        </button>
                    </td>
                `;

        tenantsTableBody.appendChild(row);
      });

      const searchInput = document.getElementById("searchTenant");
      if (searchInput.value.trim() !== "") {
        filterTenants();
      }
    })
    .catch((error) => {
      console.error("Error loading tenants:", error);
      document.getElementById("tenantsLoading").classList.add("hidden");
      document.getElementById("loadError").classList.remove("hidden");
    });
}

function filterTenants() {
  const searchInput = document.getElementById("searchTenant");
  const searchTerm = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll("#tenantsTableBody tr");

  rows.forEach((row) => {
    const name = row.querySelector("td:first-child").textContent.toLowerCase();
    const subdomain = row
      .querySelector("td:nth-child(2)")
      .textContent.toLowerCase();

    if (name.includes(searchTerm) || subdomain.includes(searchTerm)) {
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
  });

  const visibleRows = document.querySelectorAll(
    "#tenantsTableBody tr:not(.hidden)"
  );
  const noTenants = document.getElementById("noTenants");

  if (visibleRows.length === 0 && searchTerm !== "") {
    noTenants.classList.remove("hidden");
    noTenants.querySelector(
      "p:first-child"
    ).textContent = `Nenhum tenant encontrado para "${searchTerm}".`;
    noTenants.querySelector("p:last-child").textContent =
      "Tente outro termo de busca.";
  } else {
    noTenants.classList.add("hidden");
  }
}
