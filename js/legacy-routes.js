/* Known legacy detail anchors only; preserve all query parameters. */
(function () {
  "use strict";
  var routes = {
  "tentang.html#visi-misi": "visi-misi.html",
  "struktur.html#pengurus-induk": "pengurus-induk.html",
  "struktur.html#pengurus-dldpe": "pengurus-dldpe.html",
  "struktur.html#pengurus-didpe": "pengurus-didpe.html",
  "program.html#dldpe": "program-dldpe.html",
  "program.html#didpe": "program-didpe.html",
  "program.html#amex": "program-amex.html",
  "kegiatan.html#agenda-mendatang": "agenda.html",
  "kegiatan.html#kegiatan-terlaksana": "kegiatan-terlaksana.html",
  "terlibat.html#dldpe": "pendaftaran-dldpe.html",
  "terlibat.html#didpe": "pendaftaran-didpe.html",
  "terlibat.html#volunteer": "pendaftaran-volunteer.html"
};
  var key = location.pathname.split("/").pop() + location.hash;
  if (routes[key]) location.replace(routes[key] + location.search);
})();
