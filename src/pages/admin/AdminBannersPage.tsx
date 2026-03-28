import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminBannersPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/admin/cursos", { replace: true });
  }, [navigate]);

  return null;
}
