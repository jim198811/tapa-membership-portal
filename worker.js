const SESSION_COOKIE = "tapa_admin_session";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await api(request, env, url);
      }

      return env.ASSETS.fetch(request);

    } catch (err) {
      console.error("Worker error:", err);
      return json({ error: "Server error." }, 500);
    }
  }
};


/* =========================================================
   API
========================================================= */

async function api(request, env, url) {
  const p = url.pathname;


/* =========================================================
   PUBLIC PROCESSOR GROUPS
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/public/categories"
  ) {
    const { results } = await env.DB.prepare(
      `
      SELECT name
      FROM categories
      WHERE active = 1
      ORDER BY name
      `
    ).all();

    return json(results.map(r => r.name));
  }


/* =========================================================
   SUBMIT APPLICATION
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/applications"
  ) {
    return createApplication(request, env);
  }


/* =========================================================
   CHECK APPLICATION STATUS
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/status"
  ) {
    const body = await request.json();

    const no = String(
      body.applicationNo || ""
    )
      .trim()
      .toUpperCase();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const row = await env.DB.prepare(
      `
      SELECT
        application_no,
        status,
        business_name,
        full_name,
        primary_group,
        created_at
      FROM applications
      WHERE application_no = ?
      AND lower(email) = ?
      `
    )
      .bind(no, email)
      .first();

    return row
      ? json(row)
      : json(
          { error: "No matching application found." },
          404
        );
  }


/* =========================================================
   ADMIN LOGIN
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/admin/login"
  ) {
    const body = await request.json();

    const email = String(
      body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password || ""
    );

    const expectedEmail = String(
      env.ADMIN_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const expectedPassword = String(
      env.ADMIN_PASSWORD || ""
    );

    if (
      !expectedEmail ||
      !expectedPassword ||
      email !== expectedEmail ||
      !safeEqual(password, expectedPassword)
    ) {
      return json(
        { error: "Invalid email or password." },
        401
      );
    }

    if (!env.SESSION_SECRET) {
      return json(
        { error: "SESSION_SECRET is not configured." },
        500
      );
    }

    const exp =
      Math.floor(Date.now() / 1000) +
      8 * 60 * 60;

    const payload = b64url(
      JSON.stringify({
        email,
        exp
      })
    );

    const sig = await sign(
      payload,
      env.SESSION_SECRET
    );

    return new Response(
      JSON.stringify({
        ok: true,
        email
      }),
      {
        headers: {
          "content-type":
            "application/json;charset=utf-8",

          "set-cookie":
            `${SESSION_COOKIE}=` +
            `${payload}.${sig}; ` +
            `HttpOnly; Secure; ` +
            `SameSite=Lax; Path=/; ` +
            `Max-Age=28800`
        }
      }
    );
  }


/* =========================================================
   ADMIN LOGOUT
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/admin/logout"
  ) {
    return new Response(
      JSON.stringify({
        ok: true
      }),
      {
        headers: {
          "content-type":
            "application/json;charset=utf-8",

          "set-cookie":
            `${SESSION_COOKIE}=; ` +
            `HttpOnly; Secure; ` +
            `SameSite=Lax; Path=/; ` +
            `Max-Age=0`
        }
      }
    );
  }


/* =========================================================
   CHECK ADMIN SESSION
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/me"
  ) {
    const session =
      await getSession(request, env);

    return json({
      authenticated: !!session,
      email: session?.email || null
    });
  }


/* =========================================================
   PROTECT ADMIN ROUTES
========================================================= */

  const session =
    await getSession(request, env);

  if (
    !session &&
    p.startsWith("/api/admin/")
  ) {
    return json(
      { error: "Unauthorized" },
      401
    );
  }


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/dashboard"
  ) {
    const total = await scalar(
      env,
      "SELECT count(*) c FROM applications"
    );

    const pending = await scalar(
      env,
      `
      SELECT count(*) c
      FROM applications
      WHERE status = 'Pending'
      `
    );

    const review = await scalar(
      env,
      `
      SELECT count(*) c
      FROM applications
      WHERE status = 'Under Review'
      `
    );

    const approved = await scalar(
      env,
      `
      SELECT count(*) c
      FROM applications
      WHERE status = 'Approved'
      `
    );

    const { results: groups } =
      await env.DB.prepare(
        `
        SELECT
          primary_group name,
          count(*) count
        FROM applications
        GROUP BY primary_group
        ORDER BY count DESC
        `
      ).all();

    return json({
      total,
      pending,
      review,
      approved,
      groups
    });
  }


/* =========================================================
   ADMIN APPLICATION LIST
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/applications"
  ) {
    const q =
      (url.searchParams.get("q") || "")
        .trim();

    const status =
      (url.searchParams.get("status") || "")
        .trim();

    let sql = `
      SELECT
        id,
        application_no,
        created_at,
        status,
        full_name,
        email,
        phone,
        business_name,
        primary_group
      FROM applications
      WHERE 1 = 1
    `;

    const binds = [];

    if (q) {
      sql += `
        AND (
          full_name LIKE ?
          OR business_name LIKE ?
          OR application_no LIKE ?
        )
      `;

      binds.push(
        `%${q}%`,
        `%${q}%`,
        `%${q}%`
      );
    }

    if (status) {
      sql += " AND status = ?";
      binds.push(status);
    }

    sql += " ORDER BY id DESC";

    const stmt =
      env.DB.prepare(sql);

    const { results } =
      binds.length
        ? await stmt.bind(...binds).all()
        : await stmt.all();

    return json(results);
  }


/* =========================================================
   SINGLE APPLICATION ROUTE
========================================================= */

  const appMatch =
    p.match(
      /^\/api\/admin\/applications\/(\d+)$/
    );


/* =========================================================
   GET APPLICATION
========================================================= */

  if (
    appMatch &&
    request.method === "GET"
  ) {
    const id =
      Number(appMatch[1]);

    const row =
      await env.DB.prepare(
        `
        SELECT *
        FROM applications
        WHERE id = ?
        `
      )
        .bind(id)
        .first();

    if (!row) {
      return json(
        { error: "Not found" },
        404
      );
    }

    row.categories =
      parseJSON(
        row.categories,
        []
      );

    row.credentials =
      parseJSON(
        row.credentials,
        []
      );

    row.support_needs =
      parseJSON(
        row.support_needs,
        []
      );

    const { results: docs } =
      await env.DB.prepare(
        `
        SELECT
          id,
          original_name,
          object_key,
          mime,
          created_at
        FROM documents
        WHERE application_id = ?
        ORDER BY id
        `
      )
        .bind(id)
        .all();

    row.documents = docs;

    return json(row);
  }


/* =========================================================
   UPDATE APPLICATION REVIEW
========================================================= */

  if (
    appMatch &&
    request.method === "PATCH"
  ) {
    const id =
      Number(appMatch[1]);

    const body =
      await request.json();

    const allowed = [
      "Pending",
      "Under Review",
      "Approved",
      "Rejected",
      "More Information Required"
    ];

    if (
      !allowed.includes(body.status)
    ) {
      return json(
        { error: "Invalid status" },
        400
      );
    }

    const existing =
      await env.DB.prepare(
        `
        SELECT id
        FROM applications
        WHERE id = ?
        `
      )
        .bind(id)
        .first();

    if (!existing) {
      return json(
        { error: "Application not found." },
        404
      );
    }

    await env.DB.prepare(
      `
      UPDATE applications
      SET
        status = ?,
        internal_notes = ?
      WHERE id = ?
      `
    )
      .bind(
        body.status,
        String(
          body.internalNotes || ""
        ),
        id
      )
      .run();

    return json({
      ok: true
    });
  }


/* =========================================================
   DELETE APPLICATION
========================================================= */

  if (
    appMatch &&
    request.method === "DELETE"
  ) {
    const id =
      Number(appMatch[1]);

    const existing =
      await env.DB.prepare(
        `
        SELECT
          id,
          application_no
        FROM applications
        WHERE id = ?
        `
      )
        .bind(id)
        .first();

    if (!existing) {
      return json(
        {
          error:
            "Application not found."
        },
        404
      );
    }


    /*
      Get uploaded documents before
      deleting their database records.
    */

    const { results: docs } =
      await env.DB.prepare(
        `
        SELECT object_key
        FROM documents
        WHERE application_id = ?
        `
      )
        .bind(id)
        .all();


    /*
      If R2/FILES is configured,
      remove the uploaded objects too.

      If FILES is not configured,
      the application can still be
      deleted from D1 safely.
    */

    if (env.FILES) {
      for (const doc of docs) {
        if (!doc.object_key) continue;

        try {
          await env.FILES.delete(
            doc.object_key
          );
        } catch (err) {
          console.error(
            "Could not delete uploaded file:",
            doc.object_key,
            err
          );
        }
      }
    }


    /*
      Delete document database rows first.
    */

    await env.DB.prepare(
      `
      DELETE FROM documents
      WHERE application_id = ?
      `
    )
      .bind(id)
      .run();


    /*
      Then delete the application.
    */

    await env.DB.prepare(
      `
      DELETE FROM applications
      WHERE id = ?
      `
    )
      .bind(id)
      .run();


    return json({
      ok: true,
      deleted: id,
      applicationNo:
        existing.application_no
    });
  }


/* =========================================================
   ADMIN DOCUMENT DOWNLOAD
========================================================= */

  const docMatch =
    p.match(
      /^\/api\/admin\/documents\/(\d+)$/
    );

  if (
    docMatch &&
    request.method === "GET"
  ) {
    const doc =
      await env.DB.prepare(
        `
        SELECT *
        FROM documents
        WHERE id = ?
        `
      )
        .bind(
          Number(docMatch[1])
        )
        .first();

    if (!doc) {
      return json(
        { error: "Not found" },
        404
      );
    }

    if (!env.FILES) {
      return json(
        {
          error:
            "File storage is not configured."
        },
        503
      );
    }

    const obj =
      await env.FILES.get(
        doc.object_key
      );

    if (!obj) {
      return json(
        { error: "File not found" },
        404
      );
    }

    const headers =
      new Headers();

    obj.writeHttpMetadata(
      headers
    );

    headers.set(
      "content-type",
      doc.mime ||
        "application/octet-stream"
    );

    headers.set(
      "content-disposition",
      `inline; filename="${sanitizeHeader(
        doc.original_name
      )}"`
    );

    return new Response(
      obj.body,
      { headers }
    );
  }


/* =========================================================
   EXPORT CSV
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/export.csv"
  ) {
    const { results: rows } =
      await env.DB.prepare(
        `
        SELECT
          application_no,
          created_at,
          status,
          full_name,
          phone,
          email,
          business_name,
          business_type,
          business_description,
          primary_group,
          products,
          years_business
        FROM applications
        ORDER BY id
        `
      ).all();

    const cols = [
      "application_no",
      "created_at",
      "status",
      "full_name",
      "phone",
      "email",
      "business_name",
      "business_type",
      "business_description",
      "primary_group",
      "products",
      "years_business"
    ];

    const esc = value =>
      `"${String(
        value ?? ""
      ).replaceAll(
        '"',
        '""'
      )}"`;

    const csv = [
      cols.join(","),

      ...rows.map(row =>
        cols
          .map(column =>
            esc(row[column])
          )
          .join(",")
      )
    ].join("\n");

    return new Response(
      csv,
      {
        headers: {
          "content-type":
            "text/csv;charset=utf-8",

          "content-disposition":
            'attachment; filename="TAPA_members.csv"'
        }
      }
    );
  }


/* =========================================================
   ADMIN PROCESSOR GROUPS
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/categories"
  ) {
    const { results } =
      await env.DB.prepare(
        `
        SELECT *
        FROM categories
        ORDER BY name
        `
      ).all();

    return json(results);
  }


/* =========================================================
   ADD PROCESSOR GROUP
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/admin/categories"
  ) {
    const body =
      await request.json();

    const name =
      String(body.name || "")
        .trim();

    if (!name) {
      return json(
        { error: "Name required" },
        400
      );
    }

    try {
      await env.DB.prepare(
        `
        INSERT INTO categories(
          name,
          active
        )
        VALUES (?,1)
        `
      )
        .bind(name)
        .run();

      return json({
        ok: true
      });

    } catch (err) {
      console.error(
        "Add category error:",
        err
      );

      return json(
        {
          error:
            "Category already exists."
        },
        400
      );
    }
  }


/* =========================================================
   ENABLE / DISABLE PROCESSOR GROUP
========================================================= */

  const catMatch =
    p.match(
      /^\/api\/admin\/categories\/(\d+)$/
    );

  if (
    catMatch &&
    request.method === "PATCH"
  ) {
    const body =
      await request.json();

    await env.DB.prepare(
      `
      UPDATE categories
      SET active = ?
      WHERE id = ?
      `
    )
      .bind(
        body.active ? 1 : 0,
        Number(catMatch[1])
      )
      .run();

    return json({
      ok: true
    });
  }


/* =========================================================
   API NOT FOUND
========================================================= */

  return json(
    { error: "Not found" },
    404
  );
}


/* =========================================================
   CREATE APPLICATION
========================================================= */

async function createApplication(
  request,
  env
) {
  const form =
    await request.formData();

  const fullName =
    text(
      form,
      "fullName"
    );

  const address =
    text(
      form,
      "address"
    );

  const phone =
    text(
      form,
      "phone"
    );

  const email =
    text(
      form,
      "email"
    ).toLowerCase();

  const primaryGroup =
    text(
      form,
      "primaryGroup"
    );

  const declaration =
    text(
      form,
      "declaration"
    );

  if (
    !fullName ||
    !address ||
    !phone ||
    !email ||
    !primaryGroup ||
    declaration !== "yes"
  ) {
    return json(
      {
        error:
          "Please complete all required fields and declaration."
      },
      400
    );
  }


  const categories =
    form
      .getAll("categories")
      .map(String);

  const credentials =
    form
      .getAll("credentials")
      .map(String);

  const supportNeeds =
    form
      .getAll("supportNeeds")
      .map(String);

  const createdAt =
    new Date()
      .toISOString();


  const info =
    await env.DB.prepare(
      `
      INSERT INTO applications(
        created_at,
        status,
        full_name,
        gender,
        age_group,
        id_number,
        address,
        mailing_address,
        phone,
        email,
        registered_business,
        business_name,
        business_type,
        business_description,
        categories,
        primary_group,
        products,
        years_business,
        credentials,
        support_needs,
        expectations,
        declaration,
        signature_name,
        internal_notes
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,?,?
      )
      `
    )
      .bind(
        createdAt,
        "Pending",
        fullName,
        text(form, "gender"),
        text(form, "ageGroup"),
        text(form, "idNumber"),
        address,
        text(
          form,
          "mailingAddress"
        ),
        phone,
        email,
        text(
          form,
          "registeredBusiness"
        ),
        text(
          form,
          "businessName"
        ),
        text(
          form,
          "businessType"
        ),
        text(
          form,
          "businessDescription"
        ),
        JSON.stringify(
          categories
        ),
        primaryGroup,
        text(
          form,
          "products"
        ),
        text(
          form,
          "yearsBusiness"
        ),
        JSON.stringify(
          credentials
        ),
        JSON.stringify(
          supportNeeds
        ),
        text(
          form,
          "expectations"
        ),
        1,
        text(
          form,
          "signatureName"
        ) || fullName,
        ""
      )
      .run();


  const id =
    Number(
      info.meta.last_row_id
    );


  const applicationNo =
    `TAPA-${new Date().getFullYear()}-` +
    `${String(id).padStart(5,"0")}`;


  await env.DB.prepare(
    `
    UPDATE applications
    SET application_no = ?
    WHERE id = ?
    `
  )
    .bind(
      applicationNo,
      id
    )
    .run();


/* =========================================================
   DOCUMENT UPLOADS
========================================================= */

  const files =
    form
      .getAll("documents")
      .filter(
        file =>
          file &&
          typeof file === "object" &&
          "arrayBuffer" in file &&
          file.size > 0
      );


  /*
    Only attempt uploads when
    a FILES/R2 binding exists.
  */

  if (
    files.length &&
    env.FILES
  ) {
    for (
      const file
      of files.slice(0, 6)
    ) {
      if (
        file.size >
          MAX_FILE_SIZE
      ) {
        continue;
      }

      if (
        !ALLOWED_TYPES.has(
          file.type
        )
      ) {
        continue;
      }

      const key =
        `applications/${id}/` +
        `${crypto.randomUUID()}-` +
        `${safeName(file.name)}`;


      await env.FILES.put(
        key,
        await file.arrayBuffer(),
        {
          httpMetadata: {
            contentType:
              file.type
          }
        }
      );


      await env.DB.prepare(
        `
        INSERT INTO documents(
          application_id,
          original_name,
          object_key,
          mime,
          created_at
        )
        VALUES (?,?,?,?,?)
        `
      )
        .bind(
          id,
          file.name,
          key,
          file.type,
          createdAt
        )
        .run();
    }
  }


  return json({
    ok: true,
    applicationNo,
    status: "Pending"
  });
}


/* =========================================================
   DATABASE HELPERS
========================================================= */

async function scalar(
  env,
  sql
) {
  const result =
    await env.DB.prepare(
      sql
    ).first();

  return Number(
    result?.c || 0
  );
}


/* =========================================================
   GENERAL HELPERS
========================================================= */

function text(
  form,
  key
) {
  return String(
    form.get(key) || ""
  ).trim();
}


function parseJSON(
  value,
  fallback
) {
  try {
    return JSON.parse(
      value || ""
    );
  } catch {
    return fallback;
  }
}


function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "content-type":
          "application/json;charset=utf-8",

        "cache-control":
          "no-store"
      }
    }
  );
}


function safeName(value) {
  return String(
    value || "file"
  )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .slice(
      0,
      120
    );
}


function sanitizeHeader(
  value
) {
  return String(
    value || "file"
  )
    .replace(
      /[\r\n"]/g,
      "_"
    )
    .slice(
      0,
      120
    );
}


/* =========================================================
   CONSTANT-TIME STRING COMPARISON
========================================================= */

function safeEqual(a, b) {
  a = String(a ?? "");
  b = String(b ?? "");

  if (
    a.length !== b.length
  ) {
    return false;
  }

  let value = 0;

  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    value |=
      a.charCodeAt(i) ^
      b.charCodeAt(i);
  }

  return value === 0;
}


/* =========================================================
   BASE64 URL
========================================================= */

function b64url(value) {
  return btoa(
    unescape(
      encodeURIComponent(
        value
      )
    )
  )
    .replaceAll(
      "+",
      "-"
    )
    .replaceAll(
      "/",
      "_"
    )
    .replaceAll(
      "=",
      ""
    );
}


/* =========================================================
   SESSION SIGNING
========================================================= */

async function sign(
  payload,
  secret
) {
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is missing."
    );
  }

  const key =
    await crypto.subtle.importKey(
      "raw",

      new TextEncoder()
        .encode(secret),

      {
        name: "HMAC",
        hash: "SHA-256"
      },

      false,

      ["sign"]
    );


  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,

      new TextEncoder()
        .encode(payload)
    );


  return [
    ...new Uint8Array(
      signature
    )
  ]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}


/* =========================================================
   GET ADMIN SESSION
========================================================= */

async function getSession(
  request,
  env
) {
  const cookie =
    request.headers.get(
      "cookie"
    ) || "";


  const raw =
    cookie
      .split(";")
      .map(
        item =>
          item.trim()
      )
      .find(
        item =>
          item.startsWith(
            SESSION_COOKIE +
            "="
          )
      )
      ?.slice(
        SESSION_COOKIE.length +
        1
      );


  if (!raw) {
    return null;
  }


  const [
    payload,
    signature
  ] =
    raw.split(".");


  if (
    !payload ||
    !signature
  ) {
    return null;
  }


  if (
    !env.SESSION_SECRET
  ) {
    return null;
  }


  const expected =
    await sign(
      payload,
      env.SESSION_SECRET
    );


  if (
    !safeEqual(
      signature,
      expected
    )
  ) {
    return null;
  }


  try {
    const padding =
      "=".repeat(
        (
          4 -
          (
            payload.length %
            4
          )
        ) %
        4
      );


    const padded =
      payload
        .replaceAll(
          "-",
          "+"
        )
        .replaceAll(
          "_",
          "/"
        ) +
      padding;


    const obj =
      JSON.parse(
        decodeURIComponent(
          escape(
            atob(padded)
          )
        )
      );


    if (
      !obj.exp ||
      obj.exp <
        Math.floor(
          Date.now() /
          1000
        )
    ) {
      return null;
    }


    return obj;

  } catch {
    return null;
  }
}
