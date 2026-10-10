import api from "./api";

// Get all routes
export const getAllRoutes = async () => {
  const result = await api.get("/api/routes");

  return result;
};

// Get route by ID
export const getRouteById = async (id: number) => {
  const result = await api.get(`/api/routes/${id}`);

  return result;
};

// Create route
export const createRoute = async (route: any) => {
  const result = await api.post("/api/routes", route);

  return result;
};

// Update route
export const updateRoute = async (id: number, route: any) => {
  const result = await api.put(`/api/routes/${id}`, route);

  return result;
};

// Delete route
export const deleteRoute = async (id: number) => {
  const result = await api.delete(`/api/routes/${id}`);

  return result;
};

// Update route status
export const updateRouteStatus = async (id: number, status: string) => {
  const result = await api.put(`/api/routes/${id}`, {
    status,
  });

  return result;
};
