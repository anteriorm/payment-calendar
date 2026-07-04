import client from "../client";

export const importService = {
  importPayments: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post<{ message: string; imported: number; errors: string[] }>("/import/payments", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data);
  },
};
