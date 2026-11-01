import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Award,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button, Card } from "../../components/common";
import { SeoHead } from "../../components/common/SeoHead";

export const JalurMasukPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "reguler" | "prestasi" | "beasiswa" | "rpl"
  >("reguler");

  return (
    <div className="space-y-16 pb-20">
      <SeoHead
        title="Jalur Penerimaan Mahasiswa Baru 2026/2027"
        description="Informasi lengkap jalur masuk PMB UPITRA: Jalur Reguler (CBT), Jalur Prestasi Rapor, Beasiswa Triputra Group, dan Rekognisi Pembelajaran Lampau (RPL)."
      />

      {/* Header Banner */}
      <section className="bg-gradient-to-br from-biru-950 via-biru-900 to-biru-800 text-putih py-16 border-b border-biru-800">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-biru-800 text-biru-200 border border-biru-700">
            Penerimaan Mahasiswa Baru 2026
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-putih">
            Jalur Penerimaan Mahasiswa Baru
          </h1>
          <p className="text-sm sm:text-base text-biru-200 max-w-2xl mx-auto font-sans leading-relaxed">
            Pilih jalur seleksi yang paling sesuai dengan kualifikasi, prestasi
            akademik, dan rencana masa depan Anda di Universitas Pignatelli
            Triputra.
          </p>
        </div>
      </section>

      {/* Navigasi Tab Jalur */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex border-b border-biru-200 overflow-x-auto gap-2 sm:gap-4 pb-px">
          {[
            { id: "reguler", label: "Jalur Reguler (CBT)", icon: BookOpen },
            { id: "prestasi", label: "Jalur Prestasi Rapor", icon: Award },
            {
              id: "beasiswa",
              label: "Beasiswa Triputra Group",
              icon: Briefcase,
            },
            {
              id: "rpl",
              label: "Jalur RPL (Konversi SKS)",
              icon: GraduationCap,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-biru-800 text-biru-950 font-bold bg-biru-50/60 rounded-t-lg"
                    : "border-transparent text-biru-600 hover:text-biru-900 hover:border-biru-300"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive ? "text-biru-800" : "text-biru-500"}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Jalur Reguler */}
        {activeTab === "reguler" && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-biru-100 flex items-center justify-center text-biru-900">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-biru-950">
                        Jalur Reguler (Computer-Based Test)
                      </h2>
                      <p className="text-xs text-biru-600 font-medium">
                        Seleksi Ujian Mandiri Potensi Akademik &amp; Logika
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-biru-800 leading-relaxed font-sans">
                    Jalur Reguler diperuntukkan bagi seluruh lulusan SMA/SMK/MA
                    sederajat tanpa batasan tahun kelulusan. Seleksi dilakukan
                    secara objektif melalui tes online mandiri (CBT) yang
                    mencakup Penalaran Umum, Kemampuan Kuantitatif, dan Bahasa
                    Inggris dasar.
                  </p>

                  <div className="space-y-3 pt-3 border-t border-biru-100">
                    <h3 className="text-sm font-bold text-biru-950">
                      Keunggulan Jalur Reguler:
                    </h3>
                    <ul className="text-xs text-biru-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Jadwal Ujian Fleksibel:</strong> Ujian dapat
                          dikerjakan kapan saja secara daring sesuai jadwal sesi
                          yang dipilih.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Pengumuman Cepat:</strong> Nilai CBT langsung
                          muncul dan pengumuman resmi diterbitkan dalam 1x24
                          jam.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Pilihan 2 Prodi:</strong> Calon mahasiswa
                          dapat memilih Program Studi Pilihan 1 dan Pilihan 2
                          sekaligus.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-biru-100">
                    <h3 className="text-sm font-bold text-biru-950">
                      Materi Ujian CBT PMB:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          1. Penalaran Logika
                        </p>
                        <p className="text-biru-700 mt-1">
                          20 Soal &bull; 25 Menit
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          2. Literasi & Kuantitatif
                        </p>
                        <p className="text-biru-700 mt-1">
                          20 Soal &bull; 25 Menit
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          3. Bahasa Inggris Dasar
                        </p>
                        <p className="text-biru-700 mt-1">
                          20 Soal &bull; 20 Menit
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar Persyaratan */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-biru-200 space-y-4 bg-biru-50/50">
                  <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-biru-700" />
                    Persyaratan Berkas
                  </h3>
                  <ul className="text-xs text-biru-800 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>
                        Scan Ijazah SMA/SMK/MA atau Surat Keterangan Lulus (SKL)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>
                        Scan Kartu Keluarga (KK) & KTP / Kartu Pelajar
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>
                        Pasfoto resmi terbaru (latar belakang merah/biru)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Biaya formulir Rp 250.000</span>
                    </li>
                  </ul>

                  <div className="pt-4 border-t border-biru-200">
                    <Link to="/register?jalur=reguler" className="block">
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold py-2.5"
                      >
                        Daftar Jalur Reguler &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Jalur Prestasi */}
        {activeTab === "prestasi" && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-biru-100 flex items-center justify-center text-biru-900">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-biru-950">
                        Jalur Prestasi Unggul (Bebas Tes CBT)
                      </h2>
                      <p className="text-xs text-biru-600 font-medium">
                        Penghargaan Nilai Akademik Rapor &amp; Kejuaraan
                        Non-Akademik
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-biru-800 leading-relaxed font-sans">
                    Jalur Prestasi diperuntukkan bagi siswa berprestasi tinggi
                    di bangku sekolah yang memiliki rekam jejak akademik
                    cemerlang atau prestasi di bidang olahraga, seni, sains, dan
                    keagamaan. Calon mahasiswa pada jalur ini dibebaskan dari
                    ujian tertulis CBT.
                  </p>

                  <div className="space-y-3 pt-3 border-t border-biru-100">
                    <h3 className="text-sm font-bold text-biru-950">
                      Kategori Prestasi:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 space-y-1.5">
                        <p className="font-bold text-biru-900">
                          Kategori Prestasi Akademik
                        </p>
                        <p className="text-biru-700 leading-relaxed">
                          Nilai rata-rata rapor semester 1 hingga 5 minimal 80.0
                          untuk mata pelajaran Matematika, Bahasa Indonesia, dan
                          Bahasa Inggris.
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-biru-50 border border-biru-200 space-y-1.5">
                        <p className="font-bold text-biru-900">
                          Kategori Minat & Bakat
                        </p>
                        <p className="text-biru-700 leading-relaxed">
                          Juara 1, 2, atau 3 tingkat Kabupaten/Kota, Provinsi,
                          Nasional, atau Internasional dalam bidang olahraga,
                          seni, debat, OSN, atau Tahfidz Al-Qur'an.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar Persyaratan */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-biru-200 space-y-4 bg-biru-50/50">
                  <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-biru-700" />
                    Persyaratan Berkas
                  </h3>
                  <ul className="text-xs text-biru-800 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Scan Rapor legalisir semester 1-5</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>
                        Sertifikat / piagam kejuaraan resmi (jika ada)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Surat rekomendasi Kepala Sekolah</span>
                    </li>
                  </ul>

                  <div className="pt-4 border-t border-biru-200">
                    <Link to="/register?jalur=prestasi" className="block">
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold py-2.5"
                      >
                        Daftar Jalur Prestasi &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Beasiswa Triputra */}
        {activeTab === "beasiswa" && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-biru-900 text-putih flex items-center justify-center">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-biru-950">
                        Beasiswa Kemitraan Triputra Group
                      </h2>
                      <p className="text-xs text-biru-600 font-medium">
                        Pembebasan Biaya Kuliah 100% &amp; Jalur Ikatan Kerja
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-biru-800 leading-relaxed font-sans">
                    Program beasiswa terpadu dari korporasi terkemuka{" "}
                    <strong>Triputra Group</strong>. Penerima beasiswa
                    mendapatkan pembebasan biaya SPP/UKT secara penuh, pembinaan
                    karakter kepemimpinan, sertifikasi profesional, dan
                    kesempatan rekrutmen eksklusif di unit bisnis Triputra.
                  </p>

                  <div className="space-y-3 pt-3 border-t border-biru-100">
                    <h3 className="text-sm font-bold text-biru-950">
                      Fasilitas Penerima Beasiswa:
                    </h3>
                    <ul className="text-xs text-biru-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>100% Bebas UKT & DPP:</strong> Kuliah gratis
                          selama 8 semester sarjana.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Uang Saku Bulanan:</strong> Bantuan tunjangan
                          hidup selama masa perkuliahan aktif.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-biru-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Management Trainee Priority:</strong> Jalur
                          percepatan karier di Triputra Group setelah wisuda.
                        </span>
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>

              {/* Sidebar Persyaratan */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-biru-200 space-y-4 bg-biru-50/50">
                  <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-biru-700" />
                    Syarat Kelayakan
                  </h3>
                  <ul className="text-xs text-biru-800 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Rata-rata nilai rapor &ge; 85.0</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Essay motivasi & rencana kepemimpinan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Lolos sesi wawancara panelis industri</span>
                    </li>
                  </ul>

                  <div className="pt-4 border-t border-biru-200">
                    <Link to="/register?jalur=beasiswa" className="block">
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold py-2.5"
                      >
                        Ajukan Beasiswa Triputra &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Jalur RPL */}
        {activeTab === "rpl" && (
          <div className="mt-8 space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-6">
                <Card className="p-6 sm:p-8 border-biru-200 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-biru-100 flex items-center justify-center text-biru-900">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-biru-950">
                        Jalur Rekognisi Pembelajaran Lampau (RPL Tipe A)
                      </h2>
                      <p className="text-xs text-biru-600 font-medium">
                        Konversi Pengalaman Kerja &amp; Pelatihan Menjadi SKS
                        Resmi
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-biru-800 leading-relaxed font-sans">
                    Jalur RPL adalah pengakuan resmi atas capaian pembelajaran
                    yang diperoleh seseorang dari pendidikan nonformal,
                    informal, dan/atau pengalaman kerja untuk melanjutkan ke
                    jenjang pendidikan formal Sarjana (S1). Lulusan dapat
                    menyelesaikan sarjana lebih cepat (2-4 semester).
                  </p>

                  <div className="space-y-3 pt-3 border-t border-biru-100">
                    <h3 className="text-sm font-bold text-biru-950">
                      Alur Pelaksanaan Asesmen RPL:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          1. Unggah Portofolio
                        </p>
                        <p className="text-biru-700 mt-1">
                          CV, SK Kerja, sertifikat pelatihan, dan karya
                          profesional.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          2. Asesmen Asesor
                        </p>
                        <p className="text-biru-700 mt-1">
                          Penilaian kecocokan silabus mata kuliah oleh dosen
                          asesor.
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-biru-50 border border-biru-200">
                        <p className="font-bold text-biru-900">
                          3. Berita Acara Konversi
                        </p>
                        <p className="text-biru-700 mt-1">
                          Penerbitan SK konversi SKS dan jadwal kuliah sisa.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar Persyaratan */}
              <div className="lg:col-span-4 space-y-6">
                <Card className="p-6 border-biru-200 space-y-4 bg-biru-50/50">
                  <h3 className="font-serif text-lg font-bold text-biru-950 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-biru-700" />
                    Persyaratan Calon RPL
                  </h3>
                  <ul className="text-xs text-biru-800 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Pengalaman kerja relevan minimal 2 tahun</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Ijazah terakhir (SMA/SMK/D1/D2/D3/Pindahan)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-biru-600 mt-1.5 shrink-0" />
                      <span>Bukti portofolio / sertifikat keahlian</span>
                    </li>
                  </ul>

                  <div className="pt-4 border-t border-biru-200">
                    <Link to="/register?jalur=rpl" className="block">
                      <Button
                        variant="primary"
                        className="w-full text-xs font-bold py-2.5"
                      >
                        Daftar Jalur RPL &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
