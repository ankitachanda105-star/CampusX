# CampusX — Seeded Test Accounts (Lovely Professional University)

The following institutional accounts are provisioned into MongoDB for testing role authentication in CampusX at **Lovely Professional University (LPU), Phagwara, Punjab**.

You can authenticate using either the **LPU Registration / Employee ID** or the **institutional email**.

| Role | Name | Reg No / Emp ID | Email | Password | Department / School | Allowed Dashboard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Student** | Alex Kumar | `12345678` | `alex.12345678@lpu.in` | `Student@123` | *None* (`null`) | `/student/dashboard` |
| **Faculty/Staff** | Dr. Eleanor Vance | `EMP20491` | `eleanor.vance@lpu.in` | `Faculty@123` | School of Computer Science & Engineering | `/faculty/dashboard` |
| **Admin** | Marcus Ward | `ADM10822` | `marcus.admin@lpu.in` | `Admin@123` | Hostel Administration | `/admin/dashboard` |
| **Super Admin** | Dr. Sarah Jenkins | `DIR001` | `sarah.jenkins@lpu.in` | `SuperAdmin@123` | Student Welfare | `/superadmin/dashboard` |

> [!NOTE]
> All passwords are cryptographically hashed with `bcrypt` (10 rounds) and never stored or returned in plaintext.
