"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type Notification = {
  id: string;
  title: string;
  body: string;
  request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,request_id,read_at,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(15);
      setItems((data ?? []) as Notification[]);
    };

    void load();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((current) => [payload.new as Notification, ...current].slice(0, 15))
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user]);

  if (!user) return null;
  const unread = items.filter((item) => !item.read_at).length;

  const markAllRead = async () => {
    const now = new Date().toISOString();
    const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ read_at: now }).in("id", unreadIds);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? now })));
  };

  const openNotification = async (item: Notification) => {
    if (!item.read_at) {
      const now = new Date().toISOString();
      await supabase.from("notifications").update({ read_at: now }).eq("id", item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: now } : row));
    }
    setOpen(false);
    if (item.request_id) {
      router.push(`/solicitudes/${item.request_id}`);
      return;
    }

    const destination = notificationDestination(item);
    if (destination) {
      router.push(destination);
    }
  };

  return (
    <div className="notificationWrap" ref={panelRef}>
      <button className="iconButton notificationButton" onClick={() => setOpen(!open)} aria-label="Notificaciones">
        <Bell size={19} />
        {unread > 0 && <span className="notificationCount">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="notificationPanel">
          <div className="notificationHeader">
            <strong>Notificaciones</strong>
            <button onClick={markAllRead}><CheckCheck size={16} /> Marcar leídas</button>
          </div>
          <div className="notificationList">
            {items.length === 0 ? (
              <p className="notificationEmpty">No tienes notificaciones.</p>
            ) : items.map((item) => (
              <button
                type="button"
                key={item.id}
                className={!item.read_at ? "notificationItem unread notificationItemButton" : "notificationItem notificationItemButton"}
                onClick={() => void openNotification(item)}
              >
                <span className="notificationItemTitle">
                  <strong>{item.title}</strong>
                  {!item.read_at && <span className="notificationNewBadge">Nueva</span>}
                </span>
                <p>{item.body}</p>
                <time>{new Date(item.created_at).toLocaleString("es-CL")}</time>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function notificationDestination(item: Notification): string | null {
  if (
    item.title === "Renueva tus documentos ZOVIT" ||
    item.title === "Cuenta pendiente por documentos"
  ) {
    return "/registro/trabajador";
  }

  return null;
}
