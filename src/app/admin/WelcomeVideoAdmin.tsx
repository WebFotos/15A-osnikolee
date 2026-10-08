"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Video, Upload, Trash2, Check, X } from "lucide-react";

export default function WelcomeVideoAdmin() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ active: boolean; videoUrl: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/welcome-video");
      if (res.ok) setConfig(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Por favor selecciona un archivo de vídeo.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert("El vídeo es demasiado grande (máx 100MB).");
      return;
    }

    setUploading(true);
    setProgress("Preparando subida…");

    try {
      // ── STEP 1: Get a presigned upload URL from our API ──────────────────
      const ext = file.name.split(".").pop() || "mp4";
      const metaForm = new FormData();
      metaForm.append("action", "get-upload-url");
      metaForm.append("ext", ext);

      const urlRes = await fetch("/api/admin/welcome-video", {
        method: "POST",
        body: metaForm,
      });

      if (!urlRes.ok) {
        const err = await urlRes.json();
        alert(err.message || "Error al preparar la subida.");
        return;
      }

      const { signedUrl, videoPath } = await urlRes.json();

      // ── STEP 2: Upload the file DIRECTLY to Supabase (bypass Vercel limit) ─
      setProgress("Subiendo vídeo directamente a Supabase…");

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        console.error("Direct upload error:", uploadRes.status, text);
        alert("Error al subir el vídeo al almacenamiento.");
        return;
      }

      // ── STEP 3: Confirm upload — save config JSON via API ────────────────
      setProgress("Guardando configuración…");

      const confirmForm = new FormData();
      confirmForm.append("action", "confirm-upload");
      confirmForm.append("videoPath", videoPath);

      const confirmRes = await fetch("/api/admin/welcome-video", {
        method: "POST",
        body: confirmForm,
      });

      if (confirmRes.ok) {
        setConfig(await confirmRes.json());
      } else {
        const err = await confirmRes.json();
        alert(err.message || "Error al guardar configuración del vídeo.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al subir el vídeo.");
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar el vídeo de bienvenida?")) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("action", "delete");
    try {
      const res = await fetch("/api/admin/welcome-video", { method: "POST", body: formData });
      if (res.ok) setConfig(await res.json());
    } catch {
      alert("Error al eliminar el vídeo.");
    } finally {
      setUploading(false);
    }
  };

  const handleToggle = async (active: boolean) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("action", "toggle");
    formData.append("active", String(active));
    try {
      const res = await fetch("/api/admin/welcome-video", { method: "POST", body: formData });
      if (res.ok) setConfig(await res.json());
    } catch {
      alert("Error al cambiar el estado.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-6 mb-8 backdrop-blur shadow-xl text-center flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold-soft" />
      </div>
    );
  }

  return (
    <div className="bg-forest-deep/80 border border-gold-soft/30 rounded-3xl p-6 mb-8 backdrop-blur shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <Video className="w-6 h-6 text-gold-warm" />
        <h2 className="font-serif text-2xl font-bold text-gold-warm">Vídeo de bienvenida</h2>
      </div>

      {!config?.videoUrl ? (
        <div className="text-center py-6 border border-dashed border-gold-soft/30 rounded-2xl bg-black/20">
          <p className="text-cream/70 font-sans mb-4 text-sm">
            No hay vídeo configurado.<br />Se reproducirá al entrar a la app.
          </p>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-gold px-6 py-3 rounded-full font-bold font-sans text-forest-deep disabled:opacity-50 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(216,182,90,0.2)]"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {progress ?? "Subir vídeo"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-full aspect-[9/16] max-w-[200px] mx-auto rounded-xl overflow-hidden bg-black border border-gold-soft/30">
            <video src={config.videoUrl} className="w-full h-full object-cover" controls playsInline muted />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-gold-soft/10">
              <span className="text-cream font-sans">Estado:</span>
              {config.active ? (
                <span className="inline-flex items-center text-green-400 font-bold text-sm bg-green-400/10 px-3 py-1 rounded-full">
                  <Check className="w-4 h-4 mr-1" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center text-cream/50 font-bold text-sm bg-black/40 px-3 py-1 rounded-full">
                  <X className="w-4 h-4 mr-1" /> Inactivo
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleToggle(!config.active)}
                disabled={uploading}
                className="w-full bg-forest-natural/40 border border-gold-soft/40 hover:bg-forest-natural/60 text-cream font-sans font-bold py-3 rounded-xl flex items-center justify-center transition-colors text-sm disabled:opacity-50"
              >
                {config.active ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={handleDelete}
                disabled={uploading}
                className="w-full bg-red-900/40 border border-red-500/30 hover:bg-red-900/60 text-red-100 font-sans font-bold py-3 rounded-xl flex items-center justify-center transition-colors text-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
              </button>
            </div>

            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              ref={fileInputRef}
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full btn-gold text-forest-deep font-sans font-bold py-3 rounded-xl flex items-center justify-center transition-all text-sm shadow-[0_0_15px_rgba(216,182,90,0.2)] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {progress ?? "Subiendo…"}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Reemplazar vídeo
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
