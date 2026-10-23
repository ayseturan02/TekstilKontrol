# İnternet Tekstil Kontrol — React Native CLI

Expo kullanılmaz. Android tablet için React Native CLI kaynak projesidir.

## Windows kurulumu
1. Node.js 20+, JDK 17, Android Studio ve Android SDK kurun.
2. Bu klasörde `npm install` çalıştırın.
3. **Android yerel proje iskeletini üretin:** Ayrı bir klasörde `npx @react-native-community/cli@latest init TekstilKontrol --version 0.79.5` çalıştırın. Oluşan `android` klasörünü bu projeye kopyalayın. Bu ZIP Android Gradle iskeletini içermediği için bu adım zorunludur.
4. `src/report.ts` dosyasında API adresini düzenleyin: Android emülatör için `10.0.2.2`, fiziksel tablet için sunucu bilgisayarın LAN IP adresi.
5. `server` klasöründe `npm ci` çalıştırın.
6. `server/.env.example` dosyasını `.env` olarak kopyalayıp SMTP ayarlarını doldurun. Hesap kurulumu gerekmez.
7. SMTP ayarlarını doldurun. `server` klasöründe `npm start` ile API'yi başlatın.
8. Proje kökünde `npx react-native start`; ikinci terminalde `npx react-native run-android`.

## Önemli sınırlar
- Taslak cihazın AsyncStorage alanında saklanır; cihazlar arasında eşitleme yapılmaz.
- PDF önizleme/yazdırma cihazın yazdırma servisini açar. E-postaya A4 PDF raporu ile fotoğraf ve videolar eklenir. PDF sunucuda Puppeteer/Chromium ile oluşturulur.
- Büyük videolar SMTP boyut limitine takılabilir. Üretimde dosya depolama ve indirme bağlantısı önerilir.
- Yerel HTTP sadece geliştirme içindir; gerçek kullanımda HTTPS zorunludur.
- Müşteri ve atölye seçenekleri örnektir, gerçek kayıtlar daha sonra yönetim panelinden gelmelidir.

## Dikey dijital kontrol formu

- Fotoğraf referansındaki çizgiler, hücre oranları ve başlık `shared/paperLayout.js` içinde vektör olarak tanımlanır. El yazıları şablonun parçası değildir; tarih dahil yeni formun tüm kullanıcı alanları boş başlar. Logo şekli vektör olarak yeniden çizilmiştir.
- Alana dokununca kağıt o bölgeye yakınlaşır ve klavye açılır. Doğrudan formun üzerinde yazılır; ayrı bir pencere açılmaz. Kağıdın tamamı düğmesi genel görünüme döndürür.
- Form, imza ve ekler `paper-form-v4:device` anahtarında otomatik saklanır. İlk açılışta son açık hesabın taslağı, yoksa eski ortak taslak aktarılır. Eski kayıtlar silinmez.
- Fotoğraf/video ekleri formun altında bulunur. En fazla 10 ek, ek başına 25 MB desteklenir. Önizlemede aynı form salt okunurdur.
- Tablet yazdırması ve e-posta eki aynı vektör şablonunu kullanır. E-postaya `Kontrol-Raporu.pdf` ile medya dosyaları eklenir. HTML dosyası gönderilmez. PDF üretimi başarısız olursa e-posta gönderilmez.
- Tarayıcı davranışının düzenlenebilir kaynağı `shared/paperScript.source.js`, üretilen dosyası `shared/paperScript.js` dosyasıdır. `npm run build:paper` ile Android WebView 74 uyumlu kod üretilir. Hermes üzerinde fonksiyon.toString() kullanılmaz.
- Paylaşılan Android Fabric TextLayoutManager hatasını önlemek için Android derlemesinde yeni mimari kapatılmıştır. WebView eklentisi nedeniyle Android yeniden derlenmelidir; iOS için pod kurulumu gerekir.
- `npm run typecheck` ve `npm test` ile kontroller çalışır. Boş form çıktısı `artifacts/kontrol-raporu-bos.pdf` içindedir.

## Kayıtlı e-posta alıcıları

- Admin paneli, profil menüsü, giriş ve çıkış kaldırıldı. Uygulama splash ekranından doğrudan forma açılır.
- `server/data/recipients.json` kalıcı adres defteridir. İlk açılışta `kalite@example.com`, `uretim@example.com` ve `musteri@example.com` örnek olarak eklenir. Örnekler arayüzde işaretlenir; silinen adresler sonraki açılışta tekrar oluşturulmaz. Dosyayı yedekleyin.
- Kullanıcılar önizleme/gönderim ekranında birden fazla kayıtlı alıcıyı işaretleyebilir. **Yeni e-posta** ile farklı adresler de aynı seçime eklenebilir; birden fazla yeni adres virgülle ayrılır. Seçimler **Uygula** ile kaydedilir, **Vazgeç** önceki alıcıları korur. Pencere telefon ve tablette ekran içine sığar; listesi kaydırılırken işlem düğmeleri görünür kalır. Seçim cihaz taslağına kaydedilir. Hiçbir alıcı kendiliğinden seçilmez; gönderim ayrıca onay ister.
- `GET /recipients` ve `POST /send` hesap gerektirmez. Hesap ve admin API uçları kaldırıldı. `RECIPIENTS_FILE` ile adres defterinin yolu değiştirilebilir.

## PDF servisi

`server` klasöründe `npm ci`, Puppeteer ve uyumlu Chromium tarayıcısını kurar. Servis aynı işletim sistemi hesabıyla çalıştırılmalıdır. Linux sunucuda Chrome sistem kütüphaneleri de bulunmalıdır. Mevcut bir tarayıcı için `PUPPETEER_EXECUTABLE_PATH` kullanılabilir.

Telefondaki e-posta taslağı için PDF, `react-native-html-to-pdf` ile cihazda üretilir; sunucu bağlantısı gerekmez. Yeni yerel modül nedeniyle Android uygulaması yeniden derlenmelidir.
