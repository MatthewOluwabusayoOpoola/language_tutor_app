export class RegisterDto {
  email: string;
  password: string;
  name: string;
  country_code: string;
  city_code: string;
}

export class LoginDto {
  email: string;
  password: string;
}
