// ============================================================
// TAPA MEMBERSHIP PORTAL - FRONT END
// ============================================================

const $ = (id) => document.getElementById(id);

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

let currentApplicationId = null;


// ============================================================
// PAGE NAVIGATION
// ============================================================

const views = ["home", "apply", "status", "admin"];

window.openView = function (id) {
  views.forEach((view) => {
    const el = $(view);

    if (el) {
      el.classList.toggle("hidden", view !== id);
    }
  });

  document
    .querySelectorAll(".nav[data-view]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === id
      );
    });

  if (id === "admin") {
    checkAdmin();
  }
};


document
  .querySelectorAll(".nav[data-view]")
  .forEach((button) => {
    button.onclick = () =>
      openView(button.dataset.view);
  });


// ============================================================
// SHARE
// ============================================================

const shareBtn = $("shareBtn");

if (shareBtn) {
  shareBtn.onclick = async () => {
    const data = {
      title: "TAPA Membership Portal",

      text:
        "Complete your Tobago Agro Processors Association membership registration.",

      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert(
          "Portal link copied to clipboard."
        );
      }
    } catch (err) {
      console.error(err);
    }
  };
}


// ============================================================
// PUBLIC PROCESSOR GROUPS
// ============================================================

async function loadCategories() {
  const categoryList = $("categoryList");
  const primaryGroup = $("primaryGroup");

  try {
    const response = await fetch("/api/public/categories");
    const categories = await response.json();

    if (!response.ok) {
      throw new Error(
        categories.error || "Could not load processor groups."
      );
    }

    const groups = categories
      .map(item => typeof item === "string" ? item : item.name)
      .filter(Boolean);

    if (categoryList) {
      categoryList.innerHTML = groups.map(name => `
        <label class="check">
          <input
            type="checkbox"
            name="categories"
            value="${esc(name)}"
          >
          ${esc(name)}
        </label>
      `).join("");
    }

    if (primaryGroup) {
      primaryGroup.innerHTML = `
        <option value="">Select Primary Processor Group</option>

        ${groups.map(name => `
          <option value="${esc(name)}">
            ${esc(name)}
          </option>
        `).join("")}
      `;
    }

  } catch (err) {
    console.error("Category load error:", err);

    if (primaryGroup) {
      primaryGroup.innerHTML =
        `<option value="">Unable to load processor groups</option>`;
    }
  }
}


// ============================================================
// CREDENTIAL / CERTIFICATE OPTIONS
// ============================================================

const credentials = [
  "Food Badge",
  "Farmers Badge",
  "Agro-processing Badge",
  "Free Sale Certificate",
  "Food Safety Training",
  "GMP",
  "HACCP",
  "Other"
];

const credentialList =
  $("credentialList");

if (credentialList) {
  credentialList.innerHTML =
    credentials
      .map(
        (item) => `
          <label class="check">
            <input
              type="checkbox"
              name="credentials"
              value="${esc(item)}"
            >
            ${esc(item)}
          </label>
        `
      )
      .join("");
}


// ============================================================
// SUPPORT REQUIRED OPTIONS
// ============================================================

const supportOptions = [
  "Training & Capacity Building",
  "Food Safety & Certification",
  "Product Development",
  "Packaging & Labelling",
  "Marketing & Branding",
  "Digital Marketing",
  "Access to Finance",
  "Equipment & Technology",
  "Market Access",
  "Export Development",
  "Business Development",
  "Networking & Distribution"
];

const supportList =
  $("supportList");

if (supportList) {
  supportList.innerHTML =
    supportOptions
      .map(
        (item) => `
          <label class="check">
            <input
              type="checkbox"
              name="supportNeeds"
              value="${esc(item)}"
            >
            ${esc(item)}
          </label>
        `
      )
      .join("");
}


// ============================================================
// CONDITIONAL OTHER FIELDS
// ============================================================

function toggleOtherField(
  selectId,
  wrapId,
  inputId
) {
  const select = $(selectId);
  const wrap = $(wrapId);
  const input = $(inputId);

  if (!select || !wrap) return;

  const show =
    select.value === "Other";

  wrap.classList.toggle(
    "hidden",
    !show
  );

  if (input) {
    input.disabled = !show;

    if (!show) {
      input.value = "";
    }
  }
}


function updateBusinessTypeOther() {
  toggleOtherField(
    "businessType",
    "businessTypeOtherWrap",
    "businessTypeOther"
  );
}


function updateBusinessDescriptionOther() {
  toggleOtherField(
    "businessDescription",
    "businessDescriptionOtherWrap",
    "businessDescriptionOther"
  );
}


function updateCredentialOther() {
  const otherSelected =
    Array.from(
      document.querySelectorAll(
        'input[name="credentials"]:checked'
      )
    ).some(
      (checkbox) =>
        checkbox.value === "Other"
    );

  const wrap =
    $("credentialOtherWrap");

  const input =
    $("credentialOther");

  if (!wrap) return;

  wrap.classList.toggle(
    "hidden",
    !otherSelected
  );

  if (input) {
    input.disabled =
      !otherSelected;

    if (!otherSelected) {
      input.value = "";
    }
  }
}


$("businessType")?.addEventListener(
  "change",
  updateBusinessTypeOther
);

$("businessDescription")?.addEventListener(
  "change",
  updateBusinessDescriptionOther
);

document
  .querySelectorAll(
    'input[name="credentials"]'
  )
  .forEach((checkbox) => {
    checkbox.addEventListener(
      "change",
      updateCredentialOther
    );
  });


// ============================================================
// APPLICATION FORM SUBMISSION
// ============================================================

const applicationForm =
  $("applicationForm");

if (applicationForm) {
  applicationForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const formMsg =
        $("formMsg");

      const submitButton =
        applicationForm.querySelector(
          'button[type="submit"]'
        );

      if (
        !applicationForm.reportValidity()
      ) {
        return;
      }

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Submitting...";
      }

      if (formMsg) {
        formMsg.innerHTML = `
          <div class="message">
            Submitting registration...
          </div>
        `;
      }

      try {
        const formData =
          new FormData(
            applicationForm
          );

        const response =
          await fetch(
            "/api/applications",
            {
              method: "POST",
              body: formData
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Registration failed."
          );
        }

        const applicationNo =
          result.applicationNo ||
          result.application_no ||
          "";

        if (formMsg) {
          formMsg.innerHTML = `
            <div class="message success">

              <strong>
                Registration submitted successfully.
              </strong>

              <br><br>

              Your application number is

              <strong>
                ${esc(applicationNo)}
              </strong>.

              <br>

              Please save this number.
              You will need it together
              with your email address
              to check your application status.

            </div>
          `;
        }

        applicationForm.reset();

        updateBusinessTypeOther();
        updateBusinessDescriptionOther();
        updateCredentialOther();

      } catch (err) {
        console.error(
          "Application error:",
          err
        );

        if (formMsg) {
          formMsg.innerHTML = `
            <div class="message error">
              ${esc(err.message)}
            </div>
          `;
        }

      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            "Submit Registration";
        }
      }
    }
  );
}


// ============================================================
// CHECK APPLICATION STATUS
// ============================================================

const checkStatusBtn =
  $("checkStatusBtn");

if (checkStatusBtn) {
  checkStatusBtn.onclick =
    checkApplicationStatus;
}


async function checkApplicationStatus() {
  const applicationNo =
    $("statusNo")
      ?.value
      ?.trim() || "";

  const email =
    $("statusEmail")
      ?.value
      ?.trim() || "";

  const target =
    $("statusResult");

  if (!applicationNo || !email) {
    if (target) {
      target.innerHTML = `
        <div class="message error">
          Enter your application number
          and email address.
        </div>
      `;
    }

    return;
  }

  if (target) {
    target.innerHTML = `
      <div class="message">
        Checking application...
      </div>
    `;
  }

  try {
    const response =
      await fetch(
        "/api/status",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              applicationNo,
              email
            })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Application not found."
      );
    }

    if (target) {
      target.innerHTML = `
        <div class="message success">

          <strong>
            ${esc(
              result.business_name ||
              result.full_name ||
              "Application"
            )}
          </strong>

          <br><br>

          Application:
          <strong>
            ${esc(result.application_no)}
          </strong>

          <br>

          Status:
          <strong>
            ${esc(result.status)}
          </strong>

          ${
            result.primary_group
              ? `
                <br>

                Primary Processor Group:
                <strong>
                  ${esc(
                    result.primary_group
                  )}
                </strong>
              `
              : ""
          }

        </div>
      `;
    }

  } catch (err) {
    if (target) {
      target.innerHTML = `
        <div class="message error">
          ${esc(err.message)}
        </div>
      `;
    }
  }
}// ============================================================
// ADMIN AUTHENTICATION
// ============================================================

async function checkAdmin() {
  try {
    const response =
      await fetch(
        "/api/admin/me",
        {
          credentials:
            "same-origin"
        }
      );

    const result =
      await response.json();

    const loggedIn =
      response.ok &&
      result.authenticated === true;

    if ($("adminLogin")) {
      $("adminLogin")
        .classList
        .toggle(
          "hidden",
          loggedIn
        );
    }

    if ($("adminPanel")) {
      $("adminPanel")
        .classList
        .toggle(
          "hidden",
          !loggedIn
        );
    }

    if (loggedIn) {
      await Promise.all([
        loadDashboard(),
        loadApplications(),
        loadAdminCategories()
      ]);
    }

  } catch (err) {
    console.error(
      "Admin session check failed:",
      err
    );

    if ($("adminLogin")) {
      $("adminLogin")
        .classList
        .remove("hidden");
    }

    if ($("adminPanel")) {
      $("adminPanel")
        .classList
        .add("hidden");
    }
  }
}


// ============================================================
// ADMIN LOGIN
// ============================================================

const loginBtn =
  $("loginBtn");

if (loginBtn) {
  loginBtn.onclick =
    async () => {
      const email =
        $("adminEmail")
          ?.value
          ?.trim() || "";

      const password =
        $("adminPassword")
          ?.value || "";

      const target =
        $("loginMsg");

      if (target) {
        target.innerHTML = `
          <div class="message">
            Signing in...
          </div>
        `;
      }

      try {
        const response =
          await fetch(
            "/api/admin/login",
            {
              method: "POST",

              credentials:
                "same-origin",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  email,
                  password
                })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Invalid email or password."
          );
        }

        if (target) {
          target.innerHTML = "";
        }

        if ($("adminPassword")) {
          $("adminPassword").value =
            "";
        }

        await checkAdmin();

      } catch (err) {
        console.error(
          "Admin login error:",
          err
        );

        if (target) {
          target.innerHTML = `
            <div class="message error">
              ${esc(err.message)}
            </div>
          `;
        }
      }
    };
}


// ============================================================
// ADMIN LOGOUT
// ============================================================

const logoutBtn =
  $("logoutBtn");

if (logoutBtn) {
  logoutBtn.onclick =
    async () => {
      try {
        await fetch(
          "/api/admin/logout",
          {
            method: "POST",
            credentials:
              "same-origin"
          }
        );

      } catch (err) {
        console.error(
          "Logout error:",
          err
        );
      }

      await checkAdmin();
    };
}


// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
  try {
    const response =
      await fetch(
        "/api/admin/dashboard",
        {
          credentials:
            "same-origin"
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Unable to load dashboard."
      );
    }

    setText(
      "stTotal",
      result.total
    );

    setText(
      "stPending",
      result.pending
    );

    setText(
      "stReview",
      result.review ??
      result.underReview ??
      0
    );

    setText(
      "stApproved",
      result.approved
    );

  } catch (err) {
    console.error(
      "Dashboard load error:",
      err
    );
  }
}


// ============================================================
// ADMIN APPLICATION LIST
// ============================================================

async function loadApplications() {
  const search =
    $("searchApps")
      ?.value
      ?.trim() || "";

  const status =
    $("filterStatus")
      ?.value
      ?.trim() || "";

  const params =
    new URLSearchParams();

  if (search) {
    params.set(
      "q",
      search
    );
  }

  if (status) {
    params.set(
      "status",
      status
    );
  }

  const target =
    $("appRows");

  if (target) {
    target.innerHTML = `
      <tr>
        <td colspan="6">
          Loading applications...
        </td>
      </tr>
    `;
  }

  try {
    const response =
      await fetch(
        `/api/admin/applications?${params.toString()}`,
        {
          credentials:
            "same-origin"
        }
      );

    const applications =
      await response.json();

    if (!response.ok) {
      throw new Error(
        applications.error ||
        "Unable to load applications."
      );
    }

    renderApplications(
      applications
    );

  } catch (err) {
    console.error(
      "Application list error:",
      err
    );

    if (target) {
      target.innerHTML = `
        <tr>
          <td colspan="6">
            ${esc(err.message)}
          </td>
        </tr>
      `;
    }
  }
}


// ============================================================
// RENDER ADMIN APPLICATION TABLE
// ============================================================

function renderApplications(
  applications
) {
  const tbody =
    $("appRows");

  if (!tbody) return;

  if (
    !Array.isArray(applications) ||
    applications.length === 0
  ) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          No applications found.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    applications
      .map(
        (app) => `
          <tr>

            <td>
              ${esc(
                app.application_no ||
                ""
              )}
            </td>

            <td>
              ${esc(
                app.full_name ||
                ""
              )}
            </td>

            <td>
              ${esc(
                app.business_name ||
                "-"
              )}
            </td>

            <td>
              ${esc(
                app.primary_group ||
                "-"
              )}
            </td>

            <td>
              <strong>
                ${esc(
                  app.status ||
                  "Pending"
                )}
              </strong>
            </td>

            <td>
              <button
                type="button"
                class="secondary review-app-btn"
                data-id="${Number(app.id)}"
              >
                Review
              </button>
            </td>

          </tr>
        `
      )
      .join("");

  tbody
    .querySelectorAll(
      ".review-app-btn"
    )
    .forEach((button) => {
      button.onclick =
        () => {
          viewApp(
            Number(
              button.dataset.id
            )
          );
        };
    });
}


// ============================================================
// APPLICATION SEARCH / FILTERS
// ============================================================

const searchBtn =
  $("searchBtn");

if (searchBtn) {
  searchBtn.onclick =
    loadApplications;
}


const searchApps =
  $("searchApps");

if (searchApps) {
  searchApps.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        loadApplications();
      }
    }
  );
}


const filterStatus =
  $("filterStatus");

if (filterStatus) {
  filterStatus.onchange =
    loadApplications;
}


// ============================================================
// REVIEW APPLICATION
// ============================================================

window.viewApp =
  async function (id) {
    currentApplicationId =
      Number(id);

    try {
      const response =
        await fetch(
          `/api/admin/applications/${currentApplicationId}`,
          {
            credentials:
              "same-origin"
          }
        );

      const app =
        await response.json();

      if (!response.ok) {
        throw new Error(
          app.error ||
          "Could not open application."
        );
      }

      openApplicationModal(
        app
      );

    } catch (err) {
      console.error(
        "Review error:",
        err
      );

      alert(
        err.message ||
        "Could not open application."
      );
    }
  };


// ============================================================
// FORMAT VALUES FOR ADMIN REVIEW
// ============================================================

function formatListValue(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  if (
    Array.isArray(value)
  ) {
    return value.length
      ? value.join(", ")
      : "-";
  }

  if (
    typeof value === "string"
  ) {
    const trimmed =
      value.trim();

    if (!trimmed) {
      return "-";
    }

    try {
      const parsed =
        JSON.parse(trimmed);

      if (
        Array.isArray(parsed)
      ) {
        return parsed.length
          ? parsed.join(", ")
          : "-";
      }

    } catch (err) {
      // Value is ordinary text.
    }

    return trimmed;
  }

  return String(value);
}


// ============================================================
// DISPLAY "OTHER" VALUES CLEANLY
// ============================================================

function combineOtherValue(
  mainValue,
  otherValue
) {
  if (
    mainValue === "Other" &&
    otherValue
  ) {
    return `Other - ${otherValue}`;
  }

  return mainValue || "-";
}


// ============================================================
// REVIEW DETAIL ITEM
// ============================================================

function reviewField(
  label,
  value
) {
  return `
    <div
      style="
        padding:10px 0;
        border-bottom:1px solid #e2e2e2;
      "
    >

      <div
        style="
          font-size:12px;
          font-weight:700;
          color:#666;
          margin-bottom:4px;
        "
      >
        ${esc(label)}
      </div>

      <div>
        ${esc(
          formatListValue(
            value
          )
        )}
      </div>

    </div>
  `;
}


// ============================================================
// OPEN REVIEW MODAL
// ============================================================

function openApplicationModal(
  app
) {
  const modal =
    $("modal");

  const modalBody =
    $("modalBody");

  if (
    !modal ||
    !modalBody
  ) {
    alert(
      "The review window could not be found."
    );

    return;
  }

  const fields = [

    [
      "Application Number",
      app.application_no
    ],

    [
      "Membership Number",
      app.membership_no
    ],

    [
      "Application Status",
      app.status
    ],

    [
      "Full Name",
      app.full_name
    ],

    [
      "Gender",
      app.gender
    ],

    [
      "Age Group",
      app.age_group
    ],

    [
      "ID Number",
      app.id_number
    ],

    [
      "Residential Address",
      app.address
    ],

    [
      "Production Address",
      app.mailing_address
    ],

    [
      "Phone",
      app.phone
    ],

    [
      "Email",
      app.email
    ],

    [
      "Registered Business",
      app.registered_business
    ],

    [
      "Business Name",
      app.business_name
    ],

    [
      "Business Type",
      combineOtherValue(
        app.business_type,
        app.business_type_other
      )
    ],

    [
      "Business Description",
      combineOtherValue(
        app.business_description,
        app.business_description_other
      )
    ],

    [
      "Processor Groups",
      app.categories
    ],

    [
      "Primary Processor Group",
      app.primary_group
    ],

    [
      "Products",
      app.products
    ],

    [
      "Years in Business",
      app.years_business
    ],

    [
      "Credentials / Certifications",
      app.credentials
    ],

    [
      "Other Credential",
      app.credential_other
    ],

    [
      "Current Production Capacity",
      app.production_capacity
    ],

    [
      "Target Production Capacity",
      app.target_production_capacity
    ],

    [
      "Current Markets",
      app.current_markets
    ],

    [
      "Target Markets",
      app.target_markets
    ],

    [
      "Business / Production Targets",
      app.business_targets
    ],

    [
      "Support Required",
      app.support_needs
    ],

    [
      "Expectations from TAPA",
      app.expectations
    ],

    [
      "Declaration",
      app.declaration
    ],

    [
      "Signature Name",
      app.signature_name
    ],

    [
      "Date Submitted",
      app.created_at
    ]

  ];


  modalBody.innerHTML = `

    <h2>
      Review Application
    </h2>

    <div
      style="
        margin-bottom:20px;
      "
    >

      ${fields
        .map(
          ([label, value]) =>
            reviewField(
              label,
              value
            )
        )
        .join("")}

    </div>


    ${
      Array.isArray(app.documents) &&
      app.documents.length
        ? `

          <h3>
            Supporting Documents
          </h3>

          <ul>

            ${app.documents
              .map(
                (doc) => `

                  <li
                    style="
                      margin-bottom:8px;
                    "
                  >

                    <a
                      href="/api/admin/documents/${Number(doc.id)}"
                      target="_blank"
                      rel="noopener"
                    >
                      ${esc(
                        doc.original_name ||
                        "Supporting Document"
                      )}
                    </a>

                  </li>

                `
              )
              .join("")}

          </ul>

        `
        : `

          <p>
            <em>
              No supporting documents uploaded.
            </em>
          </p>

        `
    }


    <hr
      style="
        margin:24px 0;
      "
    >


    <label
      for="reviewStatus"
    >
      <strong>
        Application Status
      </strong>
    </label>


    <select
      id="reviewStatus"
      style="
        width:100%;
        margin-top:6px;
        margin-bottom:15px;
        padding:10px;
      "
    >

      ${[
        "Pending",
        "Under Review",
        "Approved",
        "Rejected",
        "More Information Required"
      ]
        .map(
          (status) => `

            <option
              value="${esc(status)}"
              ${
                app.status === status
                  ? "selected"
                  : ""
              }
            >
              ${esc(status)}
            </option>

          `
        )
        .join("")}

    </select>


    <label
      for="reviewNotes"
    >
      <strong>
        Internal Notes
      </strong>
    </label>


    <textarea
      id="reviewNotes"
      rows="5"
      style="
        width:100%;
        margin-top:6px;
        margin-bottom:15px;
        padding:10px;
      "
    >${esc(
      app.internal_notes ||
      ""
    )}</textarea>


    <div
      style="
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:10px;
      "
    >

      <button
        type="button"
        id="saveReviewBtn"
        class="primary"
      >
        Save Review
      </button>


      <button
        type="button"
        id="membershipCardBtn"
        class="secondary"
      >
        Membership Card
      </button>


      <button
        type="button"
        id="deleteApplicationBtn"
        class="secondary"
        style="
          background:#b42318;
          color:white;
        "
      >
        Delete Application
      </button>


      <button
        type="button"
        id="closeReviewBtn"
        class="secondary"
      >
        Close
      </button>

    </div>


    <div
      id="reviewMessage"
      style="
        margin-top:12px;
      "
    ></div>

  `;


  modal.classList.remove(
    "hidden"
  );

  modal.style.display =
    "block";


  $("saveReviewBtn").onclick =
    saveReview;


  $("membershipCardBtn").onclick =
    () => {
      openMembershipCard(
        app
      );
    };


  $("deleteApplicationBtn").onclick =
    () => {
      deleteApplication(
        app.id
      );
    };


  $("closeReviewBtn").onclick =
    closeReviewModal;
}


// ============================================================
// SAVE ADMIN REVIEW
// ============================================================

async function saveReview() {
  if (!currentApplicationId) {
    return;
  }

  const status =
    $("reviewStatus")
      ?.value ||
    "Pending";

  const internalNotes =
    $("reviewNotes")
      ?.value ||
    "";

  const target =
    $("reviewMessage");

  if (target) {
    target.innerHTML = `
      <div class="message">
        Saving changes...
      </div>
    `;
  }

  try {
    const response =
      await fetch(
        `/api/admin/applications/${currentApplicationId}`,
        {
          method: "PATCH",

          credentials:
            "same-origin",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              status,
              internalNotes,
              internal_notes:
                internalNotes
            })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not save application."
      );
    }

    if (target) {
      target.innerHTML = `
        <div class="message success">
          Application updated successfully.

          ${
            result.membershipNo
              ? `

                <br><br>

                Membership Number:

                <strong>
                  ${esc(
                    result.membershipNo
                  )}
                </strong>

              `
              : ""
          }
        </div>
      `;
    }

    await Promise.all([
      loadDashboard(),
      loadApplications()
    ]);

  } catch (err) {
    console.error(
      "Save review error:",
      err
    );

    if (target) {
      target.innerHTML = `
        <div class="message error">
          ${esc(err.message)}
        </div>
      `;
    }
  }
}


window.saveReview =
  saveReview;// ============================================================
// DELETE APPLICATION
// ============================================================

async function deleteApplication(id) {
  const applicationId =
    Number(
      id ||
      currentApplicationId
    );

  if (!applicationId) {
    alert(
      "No application selected."
    );

    return;
  }

  const confirmed =
    confirm(
      "Are you sure you want to permanently delete this application?\n\n" +
      "This action cannot be undone."
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `/api/admin/applications/${applicationId}`,
        {
          method: "DELETE",
          credentials:
            "same-origin"
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to delete application."
      );
    }

    alert(
      "Application deleted successfully."
    );

    closeReviewModal();

    await Promise.all([
      loadDashboard(),
      loadApplications()
    ]);

  } catch (err) {
    console.error(
      "Delete application error:",
      err
    );

    alert(
      err.message ||
      "Unable to delete application."
    );
  }
}


window.deleteApplication =
  deleteApplication;


// ============================================================
// CLOSE REVIEW MODAL
// ============================================================

function closeReviewModal() {
  const modal =
    $("modal");

  if (!modal) {
    return;
  }

  modal.classList.add(
    "hidden"
  );

  modal.style.display =
    "none";

  currentApplicationId =
    null;
}


window.closeReviewModal =
  closeReviewModal;


if ($("closeModal")) {
  $("closeModal").onclick =
    closeReviewModal;
}


// ============================================================
// MEMBERSHIP CARD
// ============================================================

function openMembershipCard(app) {
  if (
    app.status !== "Approved" ||
    !app.membership_no
  ) {
    alert(
      "Membership cards are only available for approved members."
    );

    return;
  }

  const membershipNo =
    String(
      app.membership_no
    );

  const verificationUrl =
    `${window.location.origin}/api/public/verify/` +
    encodeURIComponent(
      membershipNo
    );

  createMembershipQRCode(
    verificationUrl
  )
    .then(
      (qrDataUrl) => {
        renderMembershipCard(
          app,
          qrDataUrl,
          verificationUrl
        );
      }
    )
    .catch(
      (err) => {
        console.error(
          "QR generation error:",
          err
        );

        alert(
          "Unable to generate the membership QR code."
        );
      }
    );
}


window.openMembershipCard =
  openMembershipCard;


// ============================================================
// CREATE MEMBERSHIP QR CODE
// ============================================================

function createMembershipQRCode(
  verificationUrl
) {
  return new Promise(
    (resolve, reject) => {
      try {
        if (
          typeof QRCode ===
          "undefined"
        ) {
          reject(
            new Error(
              "QRCode library is not loaded."
            )
          );

          return;
        }

        const qrHost =
          document.createElement(
            "div"
          );

        qrHost.style.position =
          "fixed";

        qrHost.style.left =
          "-10000px";

        qrHost.style.top =
          "-10000px";

        qrHost.style.width =
          "180px";

        qrHost.style.height =
          "180px";

        qrHost.style.background =
          "#ffffff";

        qrHost.style.padding =
          "10px";

        document.body.appendChild(
          qrHost
        );

        new QRCode(
          qrHost,
          {
            text:
              verificationUrl,

            width: 180,
            height: 180,

            correctLevel:
              QRCode
                .CorrectLevel
                .H
          }
        );

        setTimeout(
          () => {
            try {
              const canvas =
                qrHost.querySelector(
                  "canvas"
                );

              const image =
                qrHost.querySelector(
                  "img"
                );

              let dataUrl =
                "";

              if (canvas) {
                dataUrl =
                  canvas.toDataURL(
                    "image/png"
                  );
              } else if (
                image &&
                image.src
              ) {
                dataUrl =
                  image.src;
              }

              qrHost.remove();

              if (!dataUrl) {
                reject(
                  new Error(
                    "QR image was not created."
                  )
                );

                return;
              }

              resolve(
                dataUrl
              );

            } catch (err) {
              qrHost.remove();

              reject(err);
            }
          },
          250
        );

      } catch (err) {
        reject(err);
      }
    }
  );
}


// ============================================================
// MEMBERSHIP CARD HTML
// ============================================================

function renderMembershipCard(
  app,
  qrDataUrl,
  verificationUrl
) {
  const memberName =
    app.full_name ||
    "TAPA Member";

  const membershipNo =
    app.membership_no ||
    "";

  const businessName =
    app.business_name ||
    "Not Provided";

  const primaryGroup =
    app.primary_group ||
    "Not Provided";

  const memberSince =
    formatMemberSince(
      app.created_at
    );

  const html = `
<!DOCTYPE html>

<html lang="en">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
>

<title>
  TAPA Membership Card -
  ${esc(memberName)}
</title>

<style>

  * {
    box-sizing:
      border-box;
  }

  body {
    margin: 0;
    padding: 30px 15px;
    background:
      #eef2ef;
    font-family:
      Arial,
      Helvetica,
      sans-serif;
    color:
      #16251a;
  }

  .page {
    max-width:
      820px;
    margin:
      0 auto;
  }

  .card {
    width:
      100%;
    max-width:
      760px;
    min-height:
      430px;
    margin:
      0 auto;
    background:
      linear-gradient(
        135deg,
        #ffffff 0%,
        #f7fbf7 100%
      );
    border:
      2px solid #1f6d3d;
    border-radius:
      22px;
    overflow:
      hidden;
    box-shadow:
      0 18px 45px
      rgba(
        0,
        0,
        0,
        0.16
      );
  }

  .top {
    background:
      #1f6d3d;
    color:
      white;
    padding:
      24px 28px;
    display:
      flex;
    justify-content:
      space-between;
    align-items:
      center;
    gap:
      20px;
  }

  .association {
    font-size:
      14px;
    letter-spacing:
      1px;
    text-transform:
      uppercase;
    opacity:
      0.95;
  }

  .title {
    font-size:
      27px;
    font-weight:
      800;
    margin-top:
      5px;
  }

  .active {
    background:
      white;
    color:
      #1f6d3d;
    font-size:
      12px;
    font-weight:
      800;
    padding:
      9px 13px;
    border-radius:
      999px;
    white-space:
      nowrap;
  }

  .content {
    display:
      grid;
    grid-template-columns:
      1fr 200px;
    gap:
      25px;
    padding:
      30px;
  }

  .member-label {
    color:
      #68766c;
    font-size:
      12px;
    font-weight:
      700;
    text-transform:
      uppercase;
    letter-spacing:
      0.6px;
    margin-bottom:
      4px;
  }

  .member-name {
    font-size:
      30px;
    line-height:
      1.15;
    font-weight:
      800;
    margin-bottom:
      25px;
  }

  .info-grid {
    display:
      grid;
    grid-template-columns:
      1fr 1fr;
    gap:
      18px 25px;
  }

  .value {
    font-size:
      16px;
    font-weight:
      700;
    line-height:
      1.35;
  }

  .membership-number {
    color:
      #1f6d3d;
    font-size:
      20px;
    font-weight:
      800;
  }

  .qr-area {
    display:
      flex;
    flex-direction:
      column;
    align-items:
      center;
    justify-content:
      center;
    text-align:
      center;
    border-left:
      1px solid #d8e1da;
    padding-left:
      25px;
  }

  .qr {
    width:
      170px;
    height:
      170px;
    background:
      white;
    padding:
      8px;
    border:
      1px solid #ccd8cf;
    border-radius:
      12px;
  }

  .qr img {
    display:
      block;
    width:
      100%;
    height:
      100%;
  }

  .verify {
    margin-top:
      10px;
    font-size:
      12px;
    color:
      #5f6d63;
    line-height:
      1.35;
  }

  .footer {
    padding:
      16px 28px;
    border-top:
      1px solid #dce5de;
    display:
      flex;
    justify-content:
      space-between;
    align-items:
      center;
    gap:
      15px;
    font-size:
      12px;
    color:
      #5d6a60;
  }

  .footer strong {
    color:
      #1f6d3d;
  }

  .controls {
    max-width:
      760px;
    margin:
      20px auto 0;
    display:
      flex;
    gap:
      10px;
    justify-content:
      center;
    flex-wrap:
      wrap;
  }

  button {
    border:
      0;
    border-radius:
      10px;
    padding:
      11px 18px;
    cursor:
      pointer;
    font-size:
      14px;
    font-weight:
      700;
  }

  .print {
    background:
      #1f6d3d;
    color:
      white;
  }

  .close {
    background:
      #dfe5e0;
    color:
      #243328;
  }

  @media (
    max-width: 650px
  ) {

    body {
      padding:
        15px 8px;
    }

    .top {
      align-items:
        flex-start;
      flex-direction:
        column;
    }

    .content {
      grid-template-columns:
        1fr;
    }

    .qr-area {
      border-left:
        0;
      border-top:
        1px solid #d8e1da;
      padding-left:
        0;
      padding-top:
        25px;
    }

    .info-grid {
      grid-template-columns:
        1fr;
    }

  }

  @media print {

    body {
      background:
        white;
      padding:
        0;
    }

    .controls {
      display:
        none !important;
    }

    .card {
      box-shadow:
        none;
      max-width:
        none;
    }

  }

</style>

</head>


<body>

<div class="page">

  <div class="card">

    <div class="top">

      <div>

        <div class="association">
          Tobago Agro-Processors Association
        </div>

        <div class="title">
          Official Member
        </div>

      </div>


      <div class="active">
        ACTIVE MEMBER
      </div>

    </div>


    <div class="content">

      <div>

        <div class="member-label">
          Member Name
        </div>

        <div class="member-name">
          ${esc(memberName)}
        </div>


        <div class="info-grid">

          <div>

            <div class="member-label">
              Membership Number
            </div>

            <div class="membership-number">
              ${esc(membershipNo)}
            </div>

          </div>


          <div>

            <div class="member-label">
              Member Since
            </div>

            <div class="value">
              ${esc(memberSince)}
            </div>

          </div>


          <div>

            <div class="member-label">
              Business
            </div>

            <div class="value">
              ${esc(businessName)}
            </div>

          </div>


          <div>

            <div class="member-label">
              Processor Group
            </div>

            <div class="value">
              ${esc(primaryGroup)}
            </div>

          </div>


          <div>

            <div class="member-label">
              Membership Status
            </div>

            <div class="value">
              Approved
            </div>

          </div>

        </div>

      </div>


      <div class="qr-area">

        <div class="qr">

          <img
            src="${qrDataUrl}"
            alt="Membership verification QR code"
          >

        </div>

        <div class="verify">
          Scan QR code to verify
          TAPA membership.
        </div>

      </div>

    </div>


    <div class="footer">

      <div>
        <strong>
          Tobago Agro-Processors Association
        </strong>
      </div>

      <div>
        Membership verification enabled
      </div>

    </div>

  </div>


  <div class="controls">

    <button
      class="print"
      onclick="window.print()"
    >
      Print / Save as PDF
    </button>


    <button
      class="close"
      onclick="window.close()"
    >
      Close
    </button>

  </div>

</div>


<script>

  console.log(
    "TAPA Membership Verification:",
    ${JSON.stringify(verificationUrl)}
  );

<\/script>

</body>

</html>
  `;


  const blob =
    new Blob(
      [html],
      {
        type:
          "text/html;charset=utf-8"
      }
    );


  const cardUrl =
    URL.createObjectURL(
      blob
    );


  const cardWindow =
    window.open(
      cardUrl,
      "_blank"
    );


  if (!cardWindow) {
    URL.revokeObjectURL(
      cardUrl
    );

    alert(
      "Your browser blocked the membership card window. Please allow pop-ups for this website."
    );

    return;
  }


  setTimeout(
    () => {
      URL.revokeObjectURL(
        cardUrl
      );
    },
    60000
  );
}


// ============================================================
// FORMAT MEMBER SINCE
// ============================================================

function formatMemberSince(
  value
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-TT",
    {
      year: "numeric",
      month: "long"
    }
  );
}// ============================================================
// ADMIN PROCESSOR GROUP MANAGEMENT
// ============================================================

async function loadAdminCategories() {
  const target =
    $("categoryAdmin");

  if (!target) {
    return;
  }

  target.innerHTML = `
    <div class="message">
      Loading processor groups...
    </div>
  `;

  try {
    const response =
      await fetch(
        "/api/admin/categories",
        {
          credentials:
            "same-origin"
        }
      );

    const categories =
      await response.json();

    if (!response.ok) {
      throw new Error(
        categories.error ||
        "Could not load processor groups."
      );
    }

    if (
      !Array.isArray(categories) ||
      categories.length === 0
    ) {
      target.innerHTML = `
        <div class="message">
          No processor groups found.
        </div>
      `;

      return;
    }

    target.innerHTML =
      categories
        .map(
          (category) => {
            const active =
              category.active === 1 ||
              category.active === true ||
              category.enabled === 1 ||
              category.enabled === true;

            return `
              <div
                style="
                  display:flex;
                  align-items:center;
                  justify-content:space-between;
                  gap:12px;
                  padding:10px 0;
                  border-bottom:1px solid #e3e3e3;
                "
              >

                <div>
                  <strong>
                    ${esc(category.name)}
                  </strong>

                  <div
                    style="
                      font-size:12px;
                      margin-top:3px;
                      color:#666;
                    "
                  >
                    ${
                      active
                        ? "Active"
                        : "Disabled"
                    }
                  </div>
                </div>


                <button
                  type="button"
                  class="secondary category-toggle-btn"
                  data-id="${Number(category.id)}"
                  data-active="${
                    active
                      ? "1"
                      : "0"
                  }"
                >
                  ${
                    active
                      ? "Disable"
                      : "Enable"
                  }
                </button>

              </div>
            `;
          }
        )
        .join("");


    target
      .querySelectorAll(
        ".category-toggle-btn"
      )
      .forEach(
        (button) => {
          button.onclick =
            async () => {
              const id =
                Number(
                  button.dataset.id
                );

              const currentlyActive =
                button.dataset.active ===
                "1";

              await updateAdminCategory(
                id,
                !currentlyActive
              );
            };
        }
      );

  } catch (err) {
    console.error(
      "Admin category error:",
      err
    );

    target.innerHTML = `
      <div class="message error">
        ${esc(err.message)}
      </div>
    `;
  }
}


// ============================================================
// ADD PROCESSOR GROUP
// ============================================================

const addCategoryBtn =
  $("addCategoryBtn");

if (addCategoryBtn) {
  addCategoryBtn.onclick =
    async () => {
      const name =
        prompt(
          "Enter the new processor group name:"
        );

      if (
        !name ||
        !name.trim()
      ) {
        return;
      }

      try {
        const response =
          await fetch(
            "/api/admin/categories",
            {
              method: "POST",

              credentials:
                "same-origin",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  name:
                    name.trim()
                })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Could not add processor group."
          );
        }

        alert(
          "Processor group added successfully."
        );

        await Promise.all([
          loadAdminCategories(),
          loadCategories()
        ]);

      } catch (err) {
        console.error(
          "Add category error:",
          err
        );

        alert(
          err.message ||
          "Could not add processor group."
        );
      }
    };
}


// ============================================================
// ENABLE / DISABLE PROCESSOR GROUP
// ============================================================

async function updateAdminCategory(
  id,
  active
) {
  try {
    const response =
      await fetch(
        `/api/admin/categories/${id}`,
        {
          method: "PATCH",

          credentials:
            "same-origin",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              active,
              enabled: active
            })
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Could not update processor group."
      );
    }

    await Promise.all([
      loadAdminCategories(),
      loadCategories()
    ]);

  } catch (err) {
    console.error(
      "Update category error:",
      err
    );

    alert(
      err.message ||
      "Could not update processor group."
    );
  }
}


// ============================================================
// EXPORT CSV
// ============================================================

const exportBtn =
  $("exportBtn") ||
  $("exportCSV");

if (exportBtn) {
  exportBtn.onclick =
    (event) => {
      event.preventDefault();

      window.location.href =
        "/api/admin/export.csv";
    };
}


// ============================================================
// GENERAL HELPERS
// ============================================================

function setText(
  id,
  value
) {
  const el =
    $(id);

  if (el) {
    el.textContent =
      value ?? 0;
  }
}


// ============================================================
// SERVICE WORKER
// ============================================================

function registerServiceWorker() {
  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener(
    "load",
    () => {
      navigator
        .serviceWorker
        .register(
          "/sw.js"
        )
        .catch(
          (err) => {
            console.error(
              "Service worker registration failed:",
              err
            );
          }
        );
    }
  );
}


// ============================================================
// INITIALIZE CONDITIONAL FIELDS
// ============================================================

function initializeConditionalFields() {
  updateBusinessTypeOther();
  updateBusinessDescriptionOther();
  updateCredentialOther();
}


// ============================================================
// STARTUP
// ============================================================

(async function init() {
  await loadCategories();

  initializeConditionalFields();

  registerServiceWorker();

  if ($("home")) {
    openView("home");
  }
})();
