export function emailLayout(
  title: string,
  content: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">

  <meta name="viewport"
        content="width=device-width, initial-scale=1.0">

  <title>${title}</title>
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #f4f7fb;
  font-family: Arial, Helvetica, sans-serif;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#f4f7fb;padding:40px 15px;"
  >

    <tr>
      <td align="center">

        <!-- Main Container -->
        <table
          width="600"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:600px;
            width:100%;
            background:#ffffff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 4px 15px rgba(0,0,0,0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              style="
                background:#2563eb;
                padding:25px 30px;
                text-align:center;
              "
            >

              <div style="
                color:#ffffff;
                font-size:26px;
                font-weight:bold;
              ">
                HospitalMS
              </div>

              <div style="
                color:#dbeafe;
                font-size:13px;
                margin-top:5px;
              ">
                Smart Healthcare Appointment Management
              </div>

            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:35px 35px 30px 35px;">

              ${content}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                background:#f8fafc;
                padding:22px 30px;
                text-align:center;
                border-top:1px solid #e5e7eb;
              "
            >

              <p style="
                margin:0;
                color:#64748b;
                font-size:12px;
              ">
                This is an automated email from HospitalMS.
              </p>

              <p style="
                margin:8px 0 0;
                color:#94a3b8;
                font-size:11px;
              ">
                Please do not reply to this email.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
`;
}