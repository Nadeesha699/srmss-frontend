import api from "./api";


export const login = async (user: any) => {
  const result = await api.post("/api/auth/login", {
    email: user.email,
    password: user.password,
  });

  return result;
};

