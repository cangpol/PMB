import React, { useState } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";

export const KontakPage: React.FC = () => {
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    noHp: "",
    prodiMinat: "S1 Sains Data",
    pesan: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.email || !formData.pesan) return;
    setIsSubmitted(true);
  };

  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title="Kontak & Lokasi Kampus PMB UPITRA"
        description="Hubungi Panitia Penerimaan Mahasiswa Baru Universitas Pignatelli Triputra Surakarta. Informasi alamat kampus, peta lokasi, hotline WhatsApp, dan layanan konsultasi."
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-16 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Sekretariat &amp; Layanan Admisi
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Hubungi Kami &amp; Lokasi Kampus
          </h1>
          <p className="text-sm sm:text-base text-biru-200 max-w-2xl mx-auto font-sans leading-relaxed">
            Kunjungi kampus kami di Surakarta atau konsultasikan rencana studi
            Anda secara langsung dengan tim konselor PMB Universitas Pignatelli
            Triputra.
          </p>
        </div>
      </section>

      {/* Konten Kontak & Formulir */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Info Kontak & Peta (7 kolom) */}
          <div className="lg:col-span-7 space-y-8">
            <Card className="p-6 sm:p-8 border-biru-200 space-y-6">
              <h2 className="font-serif text-2xl font-bold text-biru-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-biru-700" />
                Sekretariat PMB Universitas Pignatelli Triputra
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs text-biru-800 font-sans">
                <div className="space-y-1">
                  <span className="font-bold text-biru-950 flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-biru-600" />
                    Alamat Kampus:
                  </span>
                  <p className="text-biru-700 leading-relaxed">
                    Jl. K.S. Tubun No. 2, Manahan, Banjarsari, Kota Surakarta,
                    Jawa Tengah 57139
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-biru-950 flex items-center gap-1.5 text-sm">
                    <Clock className="w-4 h-4 text-biru-600" />
                    Jam Pelayanan:
                  </span>
                  <p className="text-biru-700 leading-relaxed">
                    Senin &ndash; Jumat: 08.00 &ndash; 16.00 WIB
                    <br />
                    Sabtu: 08.00 &ndash; 13.00 WIB
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-biru-950 flex items-center gap-1.5 text-sm">
                    <Phone className="w-4 h-4 text-biru-600" />
                    Hotline WhatsApp:
                  </span>
                  <p className="text-biru-700 leading-relaxed">
                    <a
                      href="https://wa.me/6281234567890"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-biru-800 hover:text-biru-950 underline"
                    >
                      +62 812-3456-7890 (Chat Aktif)
                    </a>
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-biru-950 flex items-center gap-1.5 text-sm">
                    <Mail className="w-4 h-4 text-biru-600" />
                    Email Resmi Admisi:
                  </span>
                  <p className="text-biru-700 leading-relaxed">
                    <a
                      href="mailto:pmb@upitra.ac.id"
                      className="font-bold text-biru-800 hover:text-biru-950 underline"
                    >
                      pmb@upitra.ac.id
                    </a>
                  </p>
                </div>
              </div>

              {/* Peta Lokasi Placeholder Kampus Surakarta */}
              <div className="pt-4 border-t border-biru-100 space-y-2">
                <span className="text-xs font-bold text-biru-950 block">
                  Peta Lokasi Kampus (Manahan, Surakarta):
                </span>
                <div className="rounded-2xl overflow-hidden border border-biru-200 bg-biru-100/40 relative h-64 sm:h-72 flex flex-col items-center justify-center p-6 text-center text-biru-900">
                  <MapPin className="w-10 h-10 text-biru-600 animate-bounce mb-2" />
                  <p className="font-serif text-lg font-bold text-biru-950">
                    Kampus Utama Universitas Pignatelli Triputra
                  </p>
                  <p className="text-xs text-biru-700 max-w-md mt-1">
                    Kawasan Manahan, Banjarsari &ndash; Berjarak 5 menit dari
                    Stadion Manahan dan Stasiun Balapan Solo.
                  </p>
                  <a
                    href="https://maps.google.com/?q=Universitas+Pignatelli+Triputra+Surakarta"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-biru-900 text-putih text-xs font-bold shadow-soft-sm hover:bg-biru-850 transition-colors"
                  >
                    <span>Buka Petunjuk Arah di Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </Card>
          </div>

          {/* Formulir Pesan & Konsultasi (5 kolom) */}
          <div className="lg:col-span-5">
            <Card className="p-6 sm:p-8 border-biru-200 shadow-soft-md space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-biru-600">
                  Konsultasi Online
                </span>
                <h3 className="font-serif text-xl font-bold text-biru-950 mt-1">
                  Kirim Pertanyaan Tertulis
                </h3>
                <p className="text-xs text-biru-700 mt-1">
                  Tinggalkan pesan, tim konselor kami akan merespons dalam waktu
                  1x24 jam.
                </p>
              </div>

              {isSubmitted ? (
                <div className="rounded-2xl border border-biru-200 bg-biru-50 p-6 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-biru-600 mx-auto" />
                  <h4 className="font-serif text-lg font-bold text-biru-950">
                    Pesan Anda Berhasil Terkirim!
                  </h4>
                  <p className="text-xs text-biru-700 leading-relaxed">
                    Terima kasih telah menghubungi PMB UPITRA. Tim admisi kami
                    akan menghubungi Anda melalui email atau WhatsApp.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        nama: "",
                        email: "",
                        noHp: "",
                        prodiMinat: "S1 Sains Data",
                        pesan: "",
                      });
                    }}
                    className="text-xs font-semibold mt-2"
                  >
                    Kirim Pesan Lainnya
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 text-xs font-sans"
                >
                  <div>
                    <label className="block font-semibold text-biru-950 mb-1">
                      Nama Lengkap:
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama}
                      onChange={(e) =>
                        setFormData({ ...formData, nama: e.target.value })
                      }
                      placeholder="Masukkan nama Anda"
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-biru-950 mb-1">
                        Email:
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="nama@email.com"
                        className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-biru-950 mb-1">
                        Nomor WhatsApp:
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.noHp}
                        onChange={(e) =>
                          setFormData({ ...formData, noHp: e.target.value })
                        }
                        placeholder="0812xxxxxxx"
                        className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-biru-950 mb-1">
                      Program Studi yang Diminati:
                    </label>
                    <select
                      value={formData.prodiMinat}
                      onChange={(e) =>
                        setFormData({ ...formData, prodiMinat: e.target.value })
                      }
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none"
                    >
                      <option value="S1 Sains Data">S1 Sains Data</option>
                      <option value="S1 Teknologi Informasi">
                        S1 Teknologi Informasi
                      </option>
                      <option value="S1 Sistem Informasi">
                        S1 Sistem Informasi
                      </option>
                      <option value="S1 Manajemen">S1 Manajemen</option>
                      <option value="S1 Akuntansi">S1 Akuntansi</option>
                      <option value="D3 Keuangan & Perbankan">
                        D3 Keuangan & Perbankan
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-biru-950 mb-1">
                      Pertanyaan / Pesan:
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.pesan}
                      onChange={(e) =>
                        setFormData({ ...formData, pesan: e.target.value })
                      }
                      placeholder="Tuliskan pertanyaan seputar beasiswa, biaya, jalur masuk, atau persyaratan pendaftaran..."
                      className="w-full rounded-xl border border-biru-200 bg-putih px-3.5 py-2.5 text-xs text-biru-950 focus:border-biru-600 focus:outline-none resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full text-xs font-bold py-2.5 gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Pertanyaan Sekarang</span>
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};
