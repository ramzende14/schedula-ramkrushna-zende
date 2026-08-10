export function appointmentDetails(data: {
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return `
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:10px;
        margin:25px 0;
      "
    >

      <tr>
        <td style="padding:20px;">

          <p style="
            margin:0 0 15px;
            color:#334155;
            font-size:13px;
          ">
            APPOINTMENT DETAILS
          </p>

          <p style="
            margin:10px 0;
            color:#475569;
            font-size:14px;
          ">
            <strong>Doctor</strong><br>
            ${data.doctorName}
          </p>

          <p style="
            margin:15px 0;
            color:#475569;
            font-size:14px;
          ">
            <strong>Date</strong><br>
            ${data.date}
          </p>

          <p style="
            margin:15px 0 0;
            color:#475569;
            font-size:14px;
          ">
            <strong>Time</strong><br>
            ${data.startTime} - ${data.endTime}
          </p>

        </td>
      </tr>

    </table>
  `;
}