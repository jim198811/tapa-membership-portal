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

      return json(
        { error: "Server error." },
        500
      );
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
    const { results } =
      await env.DB.prepare(
        `
        SELECT name
        FROM categories
        WHERE active = 1
        ORDER BY name
        `
      ).all();

    return json(
      results.map(
        r => r.name
      )
    );
  }


/* =========================================================
   PUBLIC MEMBERSHIP VERIFICATION
========================================================= */

  if (
    request.method === "GET" &&
    p.startsWith(
      "/api/public/verify/"
    )
  ) {
    const membershipNo =
      decodeURIComponent(
        p.substring(
          "/api/public/verify/".length
        )
      )
        .trim()
        .toUpperCase();

    if (!membershipNo) {
      return json(
        {
          error:
            "Membership number required."
        },
        400
      );
    }

    const member =
      await env.DB.prepare(
        `
        SELECT
          membership_no,
          full_name,
          business_name,
          primary_group,
          status,
          created_at
        FROM applications
        WHERE membership_no = ?
        `
      )
        .bind(
          membershipNo
        )
        .first();

    if (!member) {
      return new Response(
        `
        <!DOCTYPE html>

        <html lang="en">

        <head>

          <meta charset="UTF-8">

          <meta
            name="viewport"
            content="width=device-width,initial-scale=1"
          >

          <title>
            TAPA Membership Verification
          </title>

          <style>

            body {
              font-family:
                Arial,
                sans-serif;

              background:
                #f4f4f7;

              margin:
                0;

              padding:
                30px;

              color:
                #222;
            }

            .box {
              max-width:
                600px;

              margin:
                60px auto;

              background:
                white;

              border-radius:
                18px;

              padding:
                35px;

              box-shadow:
                0 10px 35px
                rgba(
                  0,
                  0,
                  0,
                  .12
                );

              text-align:
                center;
            }

            h1 {
              color:
                #5633a8;
            }

            .invalid {
              margin-top:
                25px;

              padding:
                18px;

              background:
                #fdecec;

              color:
                #a61b1b;

              border-radius:
                12px;

              font-weight:
                bold;
            }

          </style>

        </head>


        <body>

          <div class="box">

            <h1>
              TAPA Membership Verification
            </h1>

            <div class="invalid">
              Membership record not found.
            </div>

          </div>

        </body>

        </html>
        `,
        {
          status: 404,

          headers: {
            "content-type":
              "text/html;charset=utf-8",

            "cache-control":
              "no-store"
          }
        }
      );
    }


    const isActive =
      member.status ===
      "Approved";


    const statusMessage =
      isActive
        ? "✓ VALID ACTIVE MEMBER"
        : "MEMBERSHIP NOT ACTIVE";


    const statusClass =
      isActive
        ? "valid"
        : "invalid";


    const memberSince =
      member.created_at
        ? new Date(
            member.created_at
          ).toLocaleDateString(
            "en-TT",
            {
              year:
                "numeric",

              month:
                "long"
            }
          )
        : "-";


    return new Response(
      `
      <!DOCTYPE html>

      <html lang="en">

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width,initial-scale=1"
        >

        <title>
          TAPA Membership Verification
        </title>

        <style>

          * {
            box-sizing:
              border-box;
          }

          body {
            margin:
              0;

            padding:
              30px 15px;

            font-family:
              Arial,
              Helvetica,
              sans-serif;

            background:
              #f4f6f4;

            color:
              #203025;
          }

          .box {
            max-width:
              620px;

            margin:
              45px auto;

            padding:
              32px;

            background:
              white;

            border-radius:
              18px;

            box-shadow:
              0 12px 35px
              rgba(
                0,
                0,
                0,
                .12
              );
          }

          h1 {
            color:
              #1f6d3d;

            margin-top:
              0;
          }

          .valid,
          .invalid {
            margin:
              20px 0;

            padding:
              16px;

            border-radius:
              12px;

            text-align:
              center;

            font-weight:
              800;

            font-size:
              18px;
          }

          .valid {
            background:
              #e7f7eb;

            color:
              #17652f;
          }

          .invalid {
            background:
              #fdecec;

            color:
              #a61b1b;
          }

          .field {
            padding:
              10px 0;

            border-bottom:
              1px solid #ecefec;
          }

          .label {
            font-size:
              12px;

            color:
              #68756b;

            font-weight:
              700;

            text-transform:
              uppercase;

            margin-bottom:
              4px;
          }

          .value {
            font-size:
              17px;

            font-weight:
              700;
          }

        </style>

      </head>


      <body>

        <div class="box">

          <h1>
            TAPA Membership Verification
          </h1>


          <div class="${statusClass}">
            ${escapeHtml(
              statusMessage
            )}
          </div>


          <div class="field">

            <div class="label">
              Member Name
            </div>

            <div class="value">
              ${escapeHtml(
                member.full_name ||
                "-"
              )}
            </div>

          </div>


          <div class="field">

            <div class="label">
              Membership Number
            </div>

            <div class="value">
              ${escapeHtml(
                member.membership_no ||
                "-"
              )}
            </div>

          </div>


          <div class="field">

            <div class="label">
              Business
            </div>

            <div class="value">
              ${escapeHtml(
                member.business_name ||
                "-"
              )}
            </div>

          </div>


          <div class="field">

            <div class="label">
              Processor Group
            </div>

            <div class="value">
              ${escapeHtml(
                member.primary_group ||
                "-"
              )}
            </div>

          </div>


          <div class="field">

            <div class="label">
              Member Since
            </div>

            <div class="value">
              ${escapeHtml(
                memberSince
              )}
            </div>

          </div>


          <div class="field">

            <div class="label">
              Current Status
            </div>

            <div class="value">
              ${escapeHtml(
                member.status ||
                "-"
              )}
            </div>

          </div>

        </div>

      </body>

      </html>
      `,
      {
        status:
          isActive
            ? 200
            : 403,

        headers: {
          "content-type":
            "text/html;charset=utf-8",

          "cache-control":
            "no-store"
        }
      }
    );
  }


/* =========================================================
   NEW MEMBERSHIP APPLICATION
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/applications"
  ) {
    return createApplication(
      request,
      env
    );
  }


/* =========================================================
   PUBLIC STATUS CHECK
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/status"
  ) {
    const body =
      await request.json();

    const applicationNo =
      String(
        body.applicationNo ||
        body.application_no ||
        ""
      )
        .trim()
        .toUpperCase();

    const email =
      String(
        body.email ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      !applicationNo ||
      !email
    ) {
      return json(
        {
          error:
            "Application number and email are required."
        },
        400
      );
    }


    const row =
      await env.DB.prepare(
        `
        SELECT
          application_no,
          full_name,
          business_name,
          primary_group,
          status
        FROM applications
        WHERE
          upper(application_no) = ?
          AND lower(email) = ?
        `
      )
        .bind(
          applicationNo,
          email
        )
        .first();


    if (!row) {
      return json(
        {
          error:
            "Application not found."
        },
        404
      );
    }


    return json(row);
  }/* =========================================================
   ADMIN LOGIN
========================================================= */

  if (
    request.method === "POST" &&
    p === "/api/admin/login"
  ) {
    const body =
      await request.json();

    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password || ""
      );

    const expectedEmail =
      String(
        env.ADMIN_EMAIL || ""
      )
        .trim()
        .toLowerCase();

    const expectedPassword =
      String(
        env.ADMIN_PASSWORD || ""
      );

    if (
      !expectedEmail ||
      !expectedPassword ||
      email !== expectedEmail ||
      !safeEqual(
        password,
        expectedPassword
      )
    ) {
      return json(
        {
          error:
            "Invalid email or password."
        },
        401
      );
    }

    if (!env.SESSION_SECRET) {
      return json(
        {
          error:
            "SESSION_SECRET is not configured."
        },
        500
      );
    }

    const exp =
      Math.floor(
        Date.now() / 1000
      ) +
      8 * 60 * 60;

    const payload =
      b64url(
        JSON.stringify({
          email,
          exp
        })
      );

    const sig =
      await sign(
        payload,
        env.SESSION_SECRET
      );

    const cookie =
      `${SESSION_COOKIE}=` +
      `${payload}.${sig}; ` +
      `Path=/; HttpOnly; ` +
      `Secure; SameSite=Strict; ` +
      `Max-Age=${8 * 60 * 60}`;

    return new Response(
      JSON.stringify({
        ok: true
      }),
      {
        status: 200,

        headers: {
          "content-type":
            "application/json;charset=utf-8",

          "cache-control":
            "no-store",

          "set-cookie":
            cookie
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

          "cache-control":
            "no-store",

          "set-cookie":
            `${SESSION_COOKIE}=; ` +
            `Path=/; HttpOnly; ` +
            `Secure; SameSite=Strict; ` +
            `Max-Age=0`
        }
      }
    );
  }


/* =========================================================
   ADMIN SESSION CHECK
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/me"
  ) {
    const session =
      await getSession(
        request,
        env
      );

    if (!session) {
      return json(
        {
          authenticated:
            false
        },
        401
      );
    }

    return json({
      authenticated:
        true,

      email:
        session.email
    });
  }


/* =========================================================
   PROTECT ALL ADMIN ROUTES BELOW THIS POINT
========================================================= */

  if (
    p.startsWith(
      "/api/admin/"
    )
  ) {
    const session =
      await getSession(
        request,
        env
      );

    if (!session) {
      return json(
        {
          error:
            "Unauthorized"
        },
        401
      );
    }
  }


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

  if (
    request.method === "GET" &&
    p === "/api/admin/dashboard"
  ) {
    const total =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        `
      );

    const pending =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        WHERE status = 'Pending'
        `
      );

    const review =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        WHERE status = 'Under Review'
        `
      );

    const approved =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        WHERE status = 'Approved'
        `
      );

    const rejected =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        WHERE status = 'Rejected'
        `
      );

    const moreInformationRequired =
      await scalar(
        env,
        `
        SELECT count(*) c
        FROM applications
        WHERE status =
          'More Information Required'
        `
      );

    const { results: groups } =
      await env.DB.prepare(
        `
        SELECT
          primary_group AS name,
          count(*) AS count
        FROM applications
        WHERE
          primary_group IS NOT NULL
          AND primary_group != ''
        GROUP BY primary_group
        ORDER BY count DESC
        `
      ).all();

    return json({
      total,
      pending,

      review,

      underReview:
        review,

      approved,
      rejected,

      moreInformationRequired,

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
      (
        url.searchParams.get(
          "q"
        ) || ""
      ).trim();

    const status =
      (
        url.searchParams.get(
          "status"
        ) || ""
      ).trim();

    let sql = `
      SELECT
        id,
        application_no,
        membership_no,
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
          OR membership_no LIKE ?
          OR email LIKE ?
          OR phone LIKE ?
        )
      `;

      const like =
        `%${q}%`;

      binds.push(
        like,
        like,
        like,
        like,
        like,
        like
      );
    }

    if (
      status &&
      status !==
        "All statuses"
    ) {
      sql += `
        AND status = ?
      `;

      binds.push(
        status
      );
    }

    sql += `
      ORDER BY id DESC
    `;

    const stmt =
      env.DB.prepare(
        sql
      );

    const { results } =
      binds.length
        ? await stmt
            .bind(
              ...binds
            )
            .all()
        : await stmt.all();

    return json(
      results
    );
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
      Number(
        appMatch[1]
      );

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
        {
          error:
            "Application not found."
        },
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


    row.current_markets =
      parseJSON(
        row.current_markets,
        []
      );


    row.target_markets =
      parseJSON(
        row.target_markets,
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


    row.documents =
      docs;


    return json(
      row
    );
  }


/* =========================================================
   UPDATE APPLICATION REVIEW
   Membership number is created on first approval
   and retained permanently.
========================================================= */

  if (
    appMatch &&
    request.method === "PATCH"
  ) {
    const id =
      Number(
        appMatch[1]
      );

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
      !allowed.includes(
        body.status
      )
    ) {
      return json(
        {
          error:
            "Invalid status."
        },
        400
      );
    }

    const existing =
      await env.DB.prepare(
        `
        SELECT
          id,
          membership_no
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

    let membershipNo =
      existing.membership_no ||
      null;


    if (
      body.status ===
        "Approved" &&
      !membershipNo
    ) {
      const year =
        new Date()
          .getFullYear();

      const prefix =
        `TAPA-M-${year}-`;

      const last =
        await env.DB.prepare(
          `
          SELECT MAX(
            CAST(
              substr(
                membership_no,
                -4
              )
              AS INTEGER
            )
          ) AS max_no
          FROM applications
          WHERE membership_no LIKE ?
          `
        )
          .bind(
            `${prefix}%`
          )
          .first();

      const nextNumber =
        Number(
          last?.max_no ||
          0
        ) + 1;

      membershipNo =
        `${prefix}` +
        `${String(
          nextNumber
        ).padStart(
          4,
          "0"
        )}`;
    }


    const internalNotes =
      String(
        body.internalNotes ??
        body.internal_notes ??
        ""
      );


    await env.DB.prepare(
      `
      UPDATE applications
      SET
        status = ?,
        internal_notes = ?,
        membership_no = ?
      WHERE id = ?
      `
    )
      .bind(
        body.status,
        internalNotes,
        membershipNo,
        id
      )
      .run();


    return json({
      ok: true,

      status:
        body.status,

      membershipNo,

      membership_no:
        membershipNo
    });
  }/* =========================================================
   DELETE APPLICATION
========================================================= */

  if (
    appMatch &&
    request.method === "DELETE"
  ) {
    const id =
      Number(
        appMatch[1]
      );

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


    if (env.FILES) {
      for (
        const doc
        of docs
      ) {
        if (
          !doc.object_key
        ) {
          continue;
        }

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


    await env.DB.prepare(
      `
      DELETE FROM documents
      WHERE application_id = ?
      `
    )
      .bind(id)
      .run();


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

      deleted:
        id,

      applicationNo:
        existing.application_no,

      application_no:
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
          Number(
            docMatch[1]
          )
        )
        .first();


    if (!doc) {
      return json(
        {
          error:
            "Document not found."
        },
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
        {
          error:
            "File not found."
        },
        404
      );
    }


    const headers =
      new Headers();


    if (
      typeof obj.writeHttpMetadata ===
      "function"
    ) {
      obj.writeHttpMetadata(
        headers
      );
    }


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


    headers.set(
      "cache-control",
      "private, no-store"
    );


    return new Response(
      obj.body,
      {
        headers
      }
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
          membership_no,
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
          business_type_other,
          business_description,
          business_description_other,
          categories,
          primary_group,
          products,
          years_business,
          credentials,
          credential_other,
          production_capacity,
          target_production_capacity,
          current_markets,
          target_markets,
          business_targets,
          support_needs,
          expectations,
          signature_name,
          internal_notes
        FROM applications
        ORDER BY id
        `
      ).all();


    const cols = [
      "application_no",
      "membership_no",
      "created_at",
      "status",
      "full_name",
      "gender",
      "age_group",
      "id_number",
      "address",
      "mailing_address",
      "phone",
      "email",
      "registered_business",
      "business_name",
      "business_type",
      "business_type_other",
      "business_description",
      "business_description_other",
      "categories",
      "primary_group",
      "products",
      "years_business",
      "credentials",
      "credential_other",
      "production_capacity",
      "target_production_capacity",
      "current_markets",
      "target_markets",
      "business_targets",
      "support_needs",
      "expectations",
      "signature_name",
      "internal_notes"
    ];


    const csvEscape =
      (value) =>
        `"${String(
          value ?? ""
        ).replaceAll(
          '"',
          '""'
        )}"`;


    const csv = [
      cols.join(","),

      ...rows.map(
        (row) =>
          cols
            .map(
              (column) =>
                csvEscape(
                  row[column]
                )
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
            'attachment; filename="TAPA_members.csv"',

          "cache-control":
            "no-store"
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
        SELECT
          id,
          name,
          active
        FROM categories
        ORDER BY name
        `
      ).all();


    return json(
      results
    );
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
      String(
        body.name ||
        ""
      ).trim();


    if (!name) {
      return json(
        {
          error:
            "Processor group name is required."
        },
        400
      );
    }


    try {
      const result =
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
        ok: true,

        id:
          result.meta
            ?.last_row_id ??
          null,

        name,

        active: 1
      });


    } catch (err) {
      console.error(
        "Add category error:",
        err
      );


      return json(
        {
          error:
            "Processor group already exists or could not be added."
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


    const active =
      body.active ??
      body.enabled;


    const activeValue =
      active
        ? 1
        : 0;


    const id =
      Number(
        catMatch[1]
      );


    const existing =
      await env.DB.prepare(
        `
        SELECT id
        FROM categories
        WHERE id = ?
        `
      )
        .bind(id)
        .first();


    if (!existing) {
      return json(
        {
          error:
            "Processor group not found."
        },
        404
      );
    }


    await env.DB.prepare(
      `
      UPDATE categories
      SET active = ?
      WHERE id = ?
      `
    )
      .bind(
        activeValue,
        id
      )
      .run();


    return json({
      ok: true,
      id,
      active:
        activeValue
    });
  }


/* =========================================================
   API NOT FOUND
========================================================= */

  return json(
    {
      error:
        "Not found"
    },
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
    )
      .toLowerCase();


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
      .getAll(
        "categories"
      )
      .map(String)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);


  const credentials =
    form
      .getAll(
        "credentials"
      )
      .map(String)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);


  const supportNeeds =
    form
      .getAll(
        "supportNeeds"
      )
      .map(String)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);


  const currentMarkets =
    form
      .getAll(
        "currentMarkets"
      )
      .map(String)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);


  const targetMarkets =
    form
      .getAll(
        "targetMarkets"
      )
      .map(String)
      .map(
        value =>
          value.trim()
      )
      .filter(Boolean);


  const businessType =
    text(
      form,
      "businessType"
    );


  const businessTypeOther =
    text(
      form,
      "businessTypeOther"
    );


  const businessDescription =
    text(
      form,
      "businessDescription"
    );


  const businessDescriptionOther =
    text(
      form,
      "businessDescriptionOther"
    );


  const credentialOther =
    text(
      form,
      "credentialOther"
    );


  if (
    businessType === "Other" &&
    !businessTypeOther
  ) {
    return json(
      {
        error:
          "Please specify the other business type."
      },
      400
    );
  }


  if (
    businessDescription ===
      "Other" &&
    !businessDescriptionOther
  ) {
    return json(
      {
        error:
          "Please specify the other business description."
      },
      400
    );
  }


  if (
    credentials.includes(
      "Other"
    ) &&
    !credentialOther
  ) {
    return json(
      {
        error:
          "Please specify the other credential or certification."
      },
      400
    );
  }


  const createdAt =
    new Date()
      .toISOString();  const info =
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
        business_type_other,
        business_description,
        business_description_other,
        categories,
        primary_group,
        products,
        years_business,
        credentials,
        credential_other,
        production_capacity,
        target_production_capacity,
        current_markets,
        target_markets,
        business_targets,
        support_needs,
        expectations,
        declaration,
        signature_name,
        internal_notes
      )
      VALUES (
        ?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?
      )
      `
    )
      .bind(
        createdAt,
        "Pending",
        fullName,

        text(
          form,
          "gender"
        ),

        text(
          form,
          "ageGroup"
        ),

        text(
          form,
          "idNumber"
        ),

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

        businessType,
        businessTypeOther,

        businessDescription,
        businessDescriptionOther,

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

        credentialOther,

        text(
          form,
          "productionCapacity"
        ),

        text(
          form,
          "targetProductionCapacity"
        ),

        JSON.stringify(
          currentMarkets
        ),

        JSON.stringify(
          targetMarkets
        ),

        text(
          form,
          "businessTargets"
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
    `${String(
      id
    ).padStart(
      5,
      "0"
    )}`;


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
      .getAll(
        "documents"
      )
      .filter(
        file =>
          file &&
          typeof file ===
            "object" &&
          "arrayBuffer" in
            file &&
          file.size > 0
      );


  if (
    files.length &&
    env.FILES
  ) {
    for (
      const file
      of files.slice(
        0,
        6
      )
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
        `${safeName(
          file.name
        )}`;


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

    application_no:
      applicationNo,

    status:
      "Pending"
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
    result?.c ||
    0
  );
}


function escapeHtml(
  value = ""
) {
  return String(
    value
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
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
    form.get(
      key
    ) || ""
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
    JSON.stringify(
      data
    ),
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


function safeName(
  value
) {
  return String(
    value ||
    "file"
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
    value ||
    "file"
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

function safeEqual(
  a,
  b
) {
  a =
    String(
      a ?? ""
    );

  b =
    String(
      b ?? ""
    );


  if (
    a.length !==
    b.length
  ) {
    return false;
  }


  let value =
    0;


  for (
    let i = 0;
    i < a.length;
    i++
  ) {
    value |=
      a.charCodeAt(
        i
      ) ^
      b.charCodeAt(
        i
      );
  }


  return value === 0;
}


/* =========================================================
   BASE64 URL
========================================================= */

function b64url(
  value
) {
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
        .encode(
          secret
        ),

      {
        name:
          "HMAC",

        hash:
          "SHA-256"
      },

      false,

      [
        "sign"
      ]
    );


  const signature =
    await crypto.subtle.sign(
      "HMAC",

      key,

      new TextEncoder()
        .encode(
          payload
        )
    );


  return [
    ...new Uint8Array(
      signature
    )
  ]
    .map(
      byte =>
        byte
          .toString(
            16
          )
          .padStart(
            2,
            "0"
          )
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
      .split(
        ";"
      )
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
    raw.split(
      "."
    );


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
            atob(
              padded
            )
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
