import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (courseId && lessonId) {
      navigate(`/cursos/${courseId}?lesson=${lessonId}`, { replace: true });
    } else if (courseId) {
      navigate(`/cursos/${courseId}`, { replace: true });
    } else {
      navigate("/cursos", { replace: true });
    }
  }, [courseId, lessonId, navigate]);

  return null;
}
