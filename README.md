# İnternet Tekstil Kontrol — React Native CLI

Expo kullanılmaz. Android tablet için React Native CLI kaynak projesidir.

## Windows kurulumu
1. Node.js 20+, JDK 17, Android Studio ve Android SDK kurun.
2. Bu klasörde `npm install` çalıştırın.
3. **Android yerel proje iskeletini üretin:** Ayrı bir klasörde `npx @react-native-community/cli@latest init TekstilKontrol --version 0.79.5` çalıştırın. Oluşan `android` klasörünü bu projeye kopyalayın. Bu ZIP Android Gradle iskeletini içermediği için bu adım zorunludur.
4. `src/report.ts` dosyasında API adresini düzenleyin: Android emülatör için `10.0.2.2`, fiziksel tablet için sunucu bilgisayarın LAN IP adresi.
5. `server` klasöründe `npm install` yapın. `.env.example` dosyasını `.env` olarak kopyalayın.
6. Parola hash'i üretin: `node -e "console.log(require('bcryptjs').hashSync('GUVENLI_SIFRE',12))"`; sonucu `.env` içindeki `USER_PASSWORD_HASH` alanına yazın.
7. SMTP ayarlarını doldurun. `server` klasöründe `npm start` ile API'yi başlatın.
8. Proje kökünde `npx react-native start`; ikinci terminalde `npx react-native run-android`.

## Önemli sınırlar
- Bu sürüm tek önceden tanımlı kullanıcıyı destekler. Çoklu kullanıcı yönetimi için veritabanı gerekir.
- Taslak cihazın AsyncStorage alanına kaydedilir; hassas raporlar için şifreli depolama ve sunucu senkronizasyonu eklenmelidir.
- PDF önizleme/yazdırma cihazın yazdırma servisini açar. E-posta içeriği HTML rapordur, medya dosyaları eklenir; PDF ekinin otomatik üretilmesi henüz yoktur.
- Büyük videolar SMTP boyut limitine takılabilir. Üretimde dosya depolama ve indirme bağlantısı önerilir.
- Yerel HTTP sadece geliştirme içindir; gerçek kullanımda HTTPS zorunludur.
- Müşteri ve atölye seçenekleri örnektir, gerçek kayıtlar daha sonra yönetim panelinden gelmelidir.

## Dikey dijital kontrol formu

- Fotoğraf referansındaki çizgiler, hücre oranları ve başlık `shared/paperLayout.js` içinde vektör olarak tanımlanır. El yazıları şablonun parçası değildir; tarih dahil yeni formun tüm kullanıcı alanları boş başlar. Logo şekli vektör olarak yeniden çizilmiştir.
- Alana dokununca kağıt o bölgeye yakınlaşır ve klavye açılır. Doğrudan formun üzerinde yazılır; ayrı bir pencere açılmaz. Kağıdın tamamı düğmesi genel görünüme döndürür.
- Yazı ve tikler otomatik kaydedilir. Yeni form `paper-form-v2` depolama anahtarını kullanır; önceki deneme taslağı `draft` anahtarında korunur ve yeni forma otomatik taşınmaz.
- Fotoğraf/video ekleri formun altında bulunur. En fazla 10 ek, ek başına 25 MB desteklenir. Önizlemede aynı form salt okunurdur.
- Tablet yazdırması ve e-posta eki aynı vektör şablonunu kullanır. E-postaya `Kontrol-Raporu.html` ile medya dosyaları eklenir; otomatik PDF eki henüz yoktur. A4 dikey yazdırma ekranından PDF kaydedilebilir. E-posta uygulamaları HTML gövdesini farklı gösterebildiğinden asıl sabit yerleşim HTML ekindedir.
- Tarayıcı davranışının düzenlenebilir kaynağı `shared/paperScript.source.js`, üretilen dosyası `shared/paperScript.js` dosyasıdır. `npm run build:paper` ile Android WebView 74 uyumlu kod üretilir. Hermes üzerinde fonksiyon.toString() kullanılmaz.
- Paylaşılan Android Fabric TextLayoutManager hatasını önlemek için Android derlemesinde yeni mimari kapatılmıştır. WebView eklentisi nedeniyle Android yeniden derlenmelidir; iOS için pod kurulumu gerekir.
- `npm run typecheck` ve `npm test` ile kontroller çalışır. Boş form çıktısı `artifacts/kontrol-raporu-bos.pdf` içindedir.
