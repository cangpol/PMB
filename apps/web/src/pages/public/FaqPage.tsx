import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  HelpCircle,
  Search,
  ChevronDown,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";
import type { components } from "../../types/api";

type CmsFaq = components["schemas"]["CmsFaqResponse"];

const FALLBACK_FAQS = [
  {
    id: "f1",
    kategori: "Pendaftaran",
    pertanyaan: "Bagaimana alur pendaftaran mahasiswa baru di UPITRA?",
    jawaban:
      "Alur pendaftaran terdiri dari 5 langkah mudah: (1) Buat akun di portal PMB, (2) Bayar biaya formulir via Virtual Account atau QRIS, (3) Isi biodata dan unggah dokumen pendukung, (4) Ikuti ujian CBT potensi akademik online, dan (5) Pantau pengumuman kelulusan resmi.",
  },
  {
    id: "f2",
    kategori: "Pendaftaran",
    pertanyaan:
      "Apakah ijazah paket C atau lulusan tahun sebelumnya bisa mendaftar?",
    jawaban:
      "Bisa. Universitas Pignatelli Triputra menerima seluruh lulusan SMA, SMK, MA, maupun Paket C tanpa batasan tahun kelulusan.",
  },
  {
    id: "f3",
    kategori: "Biaya & Beasiswa",
    pertanyaan: "Apakah sistem UKT di UPITRA mencakup seluruh biaya praktikum?",
    jawaban:
      "Ya, sistem UKT (Uang Kuliah Tunggal) bersifat all-in dan sudah mencakup seluruh biaya SKS, praktikum laboratorium komputer, ujian semester, serta perpustakaan.",
  },
  {
    id: "f4",
    kategori: "Biaya & Beasiswa",
    pertanyaan: "Bagaimana cara mengajukan Beasiswa Penuh Triputra Group?",
    jawaban:
      "Pilih Jalur Beasiswa Kemitraan saat membuat formulir pendaftaran, unggah bukti prestasi (rata-rata rapor minimal 85.0), dan ikuti seleksi wawancara bersama panelis Triputra.",
  },
  {
    id: "f5",
    kategori: "Ujian CBT",
    pertanyaan: "Apakah ujian CBT PMB harus datang langsung ke kampus?",
    jawaban:
      "Tidak wajib. Ujian CBT dilaksanakan secara daring (online) dan dapat dikerjakan dari rumah menggunakan laptop/PC berkamera serta peramban web modern.",
  },
  {
    id: "f6",
    kategori: "RPL",
    pertanyaan: "Berapa banyak SKS yang dapat diakui melalui Jalur RPL?",
    jawaban:
      "Melalui asesmen portofolio dan riwayat kerja yang relevan minimal 2 tahun, calon mahasiswa dapat mengonversi hingga puluhan SKS sehingga perkuliahan sarjana dapat diselesaikan dalam 2-4 semester.",
  },
  {
    id: "f7",
    kategori: "Registrasi Ulang",
    pertanyaan: "Kapan NIM (Nomor Induk Mahasiswa) resmi diterbitkan?",
    jawaban:
      "NIM resmi diterbitkan secara otomatis oleh sistem segera setelah status pembayaran registrasi ulang dinyatakan lunas dan dokumen tambahan diverifikasi oleh panitia.",
  },
];

export const FaqPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const { data: faqsData } = useQuery<CmsFaq[]>({
    queryKey: ["cms-faqs-page"],
    queryFn: async () => {
      const res = await fetch("/api/cms/faqs");
      if (!res.ok) return FALLBACK_FAQS as unknown as CmsFaq[];
      const data = await res.json();
      return data.length > 0 ? data : (FALLBACK_FAQS as unknown as CmsFaq[]);
    },
  });

  const faqs = faqsData || (FALLBACK_FAQS as unknown as CmsFaq[]);

  const categories = [
    "ALL",
    ...Array.from(new Set(faqs.map((f) => f.kategori))),
  ];

  const filteredFaqs = faqs.filter((f) => {
    const matchesCat =
      selectedCategory === "ALL" || f.kategori === selectedCategory;
    const matchesQuery =
      f.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.jawaban.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title="Tanya Jawab & Bantuan PMB (FAQ)"
        description="Pusat bantuan dan tanya jawab seputar pendaftaran mahasiswa baru Universitas Pignatelli Triputra: jadwal, biaya, CBT online, beasiswa, dan jalur RPL."
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-16 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Pusat Bantuan &amp; Informasi
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Pertanyaan yang Kerap Diajukan (FAQ)
          </h1>
          <p className="text-sm sm:text-base text-biru-200 max-w-2xl mx-auto font-sans leading-relaxed">
            Temukan jawaban lengkap atas pertanyaan seputar persyaratan, jadwal,
            sistem perkuliahan, dan fasilitas beasiswa di UPITRA.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-biru-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci: beasiswa, ujian CBT, biaya UKT, RPL..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-biru-700 bg-biru-950/90 text-sm text-putih placeholder:text-biru-400 focus:outline-none focus:border-biru-400 focus:ring-2 focus:ring-biru-400/20 shadow-soft-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main FAQ Content */}
      <section className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Kategori Tabs */}
        <div className="flex border-b border-biru-200 overflow-x-auto gap-2 pb-px">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setOpenIndex(0);
                }}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-all ${
                  isActive
                    ? "bg-biru-900 text-putih font-bold shadow-soft-xs"
                    : "text-biru-700 hover:bg-biru-50 hover:text-biru-950"
                }`}
              >
                {cat === "ALL" ? "Semua Topik" : cat}
              </button>
            );
          })}
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <Card className="p-8 text-center border-biru-200 text-biru-700 space-y-2">
              <HelpCircle className="w-8 h-8 text-biru-400 mx-auto" />
              <p className="font-bold text-biru-950">
                Tidak ada pertanyaan yang sesuai
              </p>
              <p className="text-xs">
                Coba cari dengan kata kunci lain atau pilih kategori Semua
                Topik.
              </p>
            </Card>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl border border-biru-200 bg-putih overflow-hidden shadow-soft-xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-serif text-base font-bold text-biru-950 hover:bg-biru-50/50 transition-colors gap-3"
                  >
                    <span className="leading-snug">{faq.pertanyaan}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-biru-600 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-biru-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 sm:px-5 pt-0 text-xs sm:text-sm text-biru-800 leading-relaxed font-sans border-t border-biru-100/60 mt-1">
                      <p>{faq.jawaban}</p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Card Hubungi Panitia */}
        <Card className="p-6 sm:p-8 border-biru-200 bg-biru-50/60 space-y-4 text-center">
          <MessageSquare className="w-8 h-8 text-biru-700 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-biru-950">
            Masih Perlu Bantuan Tambahan?
          </h3>
          <p className="text-xs sm:text-sm text-biru-700 max-w-lg mx-auto font-sans leading-relaxed">
            Tim panitia admisi Universitas Pignatelli Triputra siap membantu
            menjawab pertanyaan Anda melalui hotline WhatsApp atau email resmi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="https://wa.me/6281234567890?text=Halo%20Panitia%20PMB%20UPITRA"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="primary"
                size="sm"
                className="text-xs font-bold gap-2"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Hotline</span>
              </Button>
            </a>
            <Link to="/kontak">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold"
              >
                Kirim Pertanyaan Tertulis &rarr;
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
};
