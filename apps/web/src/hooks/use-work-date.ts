import { useQueryClient } from "@tanstack/react-query";
import { workDate } from "@wfh/contracts";
import { useEffect, useRef, useState } from "react";

export function useWorkDate(userId?: string): string {
  const [day, setDay] = useState(workDate());

  const previousDay = useRef(day);

  const client = useQueryClient();

  useEffect(() => {
    if (previousDay.current !== day && userId) {
      void client.invalidateQueries({ queryKey: ["attendance", userId] });
    }
    previousDay.current = day;
  }, [day, userId, client]);

  useEffect(() => {
    const update = () => setDay(workDate());
    const timer = setInterval(update, 15000);
    window.addEventListener("focus", update);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  return day;
}
