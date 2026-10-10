import api from "./api";

export const createDepot = async (depot: any) => {
  const result = await api.post("/api/depots", depot);

  return result;
};

export const getAllDepots = async () => {
  const result = await api.get("/api/depots");

  return result;
};

export const getDepotById = async (id: number) => {
  const result = await api.get(`/api/depots/${id}`);

  return result;
};

export const updateDepot = async (id: number, depot: any) => {
  const result = await api.put(`/api/depots/${id}`, depot);

  return result;
};

export const changeDepotStatus = async (id: number, status: any) => {
  const result = await api.patch(`/api/depots/${id}/status`, {
    status,
  });

  return result;
};

export const deleteDepot = async (id: number) => {
  const result = await api.delete(`/api/depots/${id}`);

  return result;
};
