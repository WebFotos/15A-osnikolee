"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getEvents, createEvent } from "@/lib/storage";
import { Event } from "@/lib/types";
import { Loader2, Plus, Calendar } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const evs = await getEvents();
    setEvents(evs);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setCreating(true);
    try {
      await createEvent({
        id: crypto.randomUUID(),
        name: newEventName.trim(),
        date: new Date().toISOString(),
        revealAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        status: 'ACTIVE'
      });
      setNewEventName("");
      await loadEvents();
    } catch (err) {
      alert("Error al crear evento");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 p-6 text-white safe-area-pt">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-3xl font-bold mb-8">Mis Eventos</h1>
        
        <form onSubmit={handleCreate} className="mb-10 bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Crear Nuevo Evento</h2>
          <div className="flex gap-4">
            <input 
              type="text" 
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              placeholder="Nombre (ej. Mis 15 de Sofía)" 
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-white"
            />
            <button 
              type="submit" 
              disabled={creating || !newEventName.trim()}
              className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
              Crear
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center text-zinc-500 py-12">
            No tienes eventos creados.
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map(ev => (
              <Link 
                key={ev.id} 
                href={`/admin/eventos/${ev.id}`}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-1">{ev.name}</h3>
                  <div className="flex items-center text-zinc-400 text-sm gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(ev.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`px-3 py-1 text-xs font-bold rounded-full ${
                  ev.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                  ev.status === 'REVEALED' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-zinc-800 text-zinc-400'
                }`}>
                  {ev.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
