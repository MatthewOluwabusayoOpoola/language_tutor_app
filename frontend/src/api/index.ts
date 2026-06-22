import api from "./client";
import type { AllProgress, City, Country, ScriptDay, User } from "../types";

// Auth
export const register = (data: {
  email: string;
  password: string;
  name: string;
  country_code: string;
  city_code: string;
}) => api.post<{ access_token: string }>("/auth/register", data);

export const login = (data: { email: string; password: string }) =>
  api.post<{ access_token: string }>("/auth/login", data);

// User
export const getProfile = () => api.get<User>("/user/profile");
export const getCountries = () => api.get<Country[]>("/user/countries");
export const getCities = (countryCode: string) =>
  api.get<City[]>(`/user/countries/${countryCode}/cities`);

// Progress
export const getAllProgress = () => api.get<AllProgress>("/user/progress");

// Scripts
export const getScript = (mode: string, day: number) =>
  api.get<ScriptDay>(`/scripts/${mode}/day/${day}`);
