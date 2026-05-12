"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageCircle, MapPin, Phone, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Veuillez remplir tous les champs obligatoires"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const { error } = await res.json();
        toast.error(error ?? "Erreur lors de l'envoi");
      }
    } catch {
      toast.error("Erreur réseau, réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const infos = [
    { icon: Mail,    label: "Email",      value: "contact@mystudys.org" },
    { icon: Phone,   label: "Téléphone",  value: "+225 07 99 29 84 20" },
    { icon: MapPin,  label: "Adresse",    value: "Abidjan, Côte d'Ivoire" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-black text-gray-900 mb-2">Nous contacter</h1>
        <p className="text-gray-500">Une question, un bug, un partenariat ? Écrivez-nous.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Formulaire */}
        <div>
          {sent ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 bg-green-50 rounded-2xl border border-green-100">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900 text-lg mb-2">Message envoyé !</h3>
              <p className="text-gray-500 text-sm">Nous vous répondrons dans les 24-48h à l'adresse indiquée.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nom complet *</label>
                  <Input placeholder="Votre nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <Input type="email" placeholder="votre@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Sujet</label>
                <Input placeholder="Objet de votre message" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Message *</label>
                <Textarea
                  placeholder="Décrivez votre demande..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="min-h-[140px]"
                  maxLength={2000}
                />
                {form.message.length > 1800 && (
                  <p className="text-xs text-gray-400 text-right">{form.message.length}/2000</p>
                )}
              </div>
              <Button type="submit" loading={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                <Send className="h-4 w-4" /> Envoyer le message
              </Button>
            </form>
          )}
        </div>

        {/* Infos contact */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            {infos.map((info) => (
              <div key={info.label} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                  <info.icon className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{info.label}</p>
                  <p className="text-gray-800 font-medium">{info.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-orange-500" /> Signaler un problème
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Pour signaler un bug ou un contenu inapproprié directement depuis l'application,
              utilisez le bouton <strong>"Signaler"</strong> disponible sur chaque publication.
            </p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="font-bold text-gray-900 mb-2">Partenariats & établissements</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Vous représentez un établissement scolaire ou universitaire et souhaitez
              intégrer STUDY'S dans votre environnement ?
              Contactez-nous à <strong>contact@mystudys.org</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
