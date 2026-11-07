/**
 * Dikirim ke `window` saat server menjawab 401 untuk pengguna yang tadinya
 * masuk (sesi habis/dicabut). AuthProvider menangkapnya lalu mengembalikan
 * pengguna ke halaman login.
 */
export const EVENT_SESI_BERAKHIR = "pmb:sesi-berakhir";
