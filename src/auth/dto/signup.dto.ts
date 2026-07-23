export class SignupDto {
  name: string;
  email!: string;
  password: string;
  role: 'DOCTOR' | 'PATIENT';
}