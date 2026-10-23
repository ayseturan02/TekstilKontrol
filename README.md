# İnternet Tekstil Kontrol — React Native CLI

Expo kullanılmaz. Android tablet için React Native CLI kaynak projesidir.

## Windows kurulumu
1. Node.js 20+, JDK 17, Android Studio ve Android SDK kurun.
2. Bu klasörde `npm install` çalıştırın.
3. **Android yerel proje iskeletini üretin:** Ayrı bir klasörde `npx @react-native-community/cli@latest init TekstilKontrol --version 0.79.5` çalıştırın. Oluşan `android` klasörünü bu projeye kopyalayın. Bu ZIP Android Gradle iskeletini içermediği için bu adım zorunludur.
4. `src/report.ts` dosyasında API adresini düzenleyin: Android emülatör için `10.0.2.2`, fiziksel tablet için sunucu bilgisayarın LAN IP adresi.
5. `server` klasöründe `npm ci` çalıştırın.
6. İlk yönetici hesabını oluşturun: `npm run setup-admin -- --first-name İnternet --last-name Tekstil --email admin@internettekstil.com`. Komut rastgele şifreyi bir kez gösterir; `.env` ve kalıcı kullanıcı kayıtlarını oluşturur.
7. SMTP ayarlarını doldurun. `server` klasöründe `npm start` ile API'yi başlatın.
8. Proje kökünde `npx react-native start`; ikinci terminalde `npx react-native run-android`.

## Önemli sınırlar
- Kullanıcılar sunucuda `server/data/users.json` dosyasında saklanır. Bu dosyayı kalıcı diskte tutun ve yedekleyin; aynı dosya için tek API süreci çalıştırın. Şifreler bcrypt ile hashlenir.
- Taslaklar cihazın AsyncStorage alanında kullanıcı kimliğine göre ayrı kaydedilir; farklı cihazlar arasında eşitleme yapılmaz.
- PDF önizleme/yazdırma cihazın yazdırma servisini açar. E-posta içeriği HTML rapordur, medya dosyaları eklenir; PDF ekinin otomatik üretilmesi henüz yoktur.
- Büyük videolar SMTP boyut limitine takılabilir. Üretimde dosya depolama ve indirme bağlantısı önerilir.
- Yerel HTTP sadece geliştirme içindir; gerçek kullanımda HTTPS zorunludur.
- Müşteri ve atölye seçenekleri örnektir, gerçek kayıtlar daha sonra yönetim panelinden gelmelidir.

## Dikey dijital kontrol formu

- Fotoğraf referansındaki çizgiler, hücre oranları ve başlık `shared/paperLayout.js` içinde vektör olarak tanımlanır. El yazıları şablonun parçası değildir; tarih dahil yeni formun tüm kullanıcı alanları boş başlar. Logo şekli vektör olarak yeniden çizilmiştir.
- Alana dokununca kağıt o bölgeye yakınlaşır ve klavye açılır. Doğrudan formun üzerinde yazılır; ayrı bir pencere açılmaz. Kağıdın tamamı düğmesi genel görünüme döndürür.
- Yazı, tik, ek ve imzalar oturumdaki kullanıcı için `paper-form-v3:user:<kullanıcı-kimliği>` anahtarında otomatik kaydedilir. Kayıtlı kişisel taslağı olmayan hesap boş başlar. Çıkışta form kaydedilip bellek temizlenir; tekrar girişte yalnızca aynı hesabın taslağı yüklenir. Eski ortak `paper-form-v2` ve `draft` kayıtları korunur; sahipleri bilinmediği için hesaplara otomatik aktarılmaz.
- Fotoğraf/video ekleri formun altında bulunur. En fazla 10 ek, ek başına 25 MB desteklenir. Önizlemede aynı form salt okunurdur.
- Tablet yazdırması ve e-posta eki aynı vektör şablonunu kullanır. E-postaya `Kontrol-Raporu.html` ile medya dosyaları eklenir; otomatik PDF eki henüz yoktur. A4 dikey yazdırma ekranından PDF kaydedilebilir. E-posta uygulamaları HTML gövdesini farklı gösterebildiğinden asıl sabit yerleşim HTML ekindedir.
- Tarayıcı davranışının düzenlenebilir kaynağı `shared/paperScript.source.js`, üretilen dosyası `shared/paperScript.js` dosyasıdır. `npm run build:paper` ile Android WebView 74 uyumlu kod üretilir. Hermes üzerinde fonksiyon.toString() kullanılmaz.
- Paylaşılan Android Fabric TextLayoutManager hatasını önlemek için Android derlemesinde yeni mimari kapatılmıştır. WebView eklentisi nedeniyle Android yeniden derlenmelidir; iOS için pod kurulumu gerekir.
- `npm run typecheck` ve `npm test` ile kontroller çalışır. Boş form çıktısı `artifacts/kontrol-raporu-bos.pdf` içindedir.

## Yönetici ve kullanıcı hesapları

- Yalnızca yönetici profil menüsünde **Ayarlar** seçeneğini görür. Sayfada hesap özetleri, isim/e-posta araması, rol filtreleri ve kullanıcı listesi bulunur. **Yeni kullanıcı** penceresinde ad, soyad, e-posta ve şifreyle hesap oluşturulur; listedeki her hesap için şifre sıfırlanabilir.
- Şifre sıfırlama yeni bir şifre belirler; eski şifre ve önceki oturumlar geçersiz olur. Yönetici kendi şifresini değiştirirse tekrar giriş yapar.
- Yönetici rolü sunucuda denetlenir. `GET /me`, `GET /admin/users`, `POST /admin/users`, `POST /admin/users/:id/reset-password` uçları imzalı oturum ister; yönetim uçları ayrıca admin rolü ister.
- İlk yönetici `server` klasöründe `npm run setup-admin -- --first-name Ad --last-name Soyad --email admin@firma.com` ile oluşturulur. Mevcut yönetici varsa kurulum komutu hesabı değiştirmez. Şifre kaynak koda veya ayar dosyasına düz metin yazılmaz.
- Önceden `USER_EMAIL` ve `USER_PASSWORD_HASH` tanımlandıysa, kullanıcı kayıt dosyası henüz yokken bu hesap ilk yönetici olarak içeri alınır. `ADMIN_FIRST_NAME` ve `ADMIN_LAST_NAME` ad-soyadı belirler.
- API adresi `src/report.ts` içindedir. Emülatör `10.0.2.2:4000` üzerinden bilgisayardaki API'ye bağlanır; fiziksel cihaz için erişilebilir sunucu adresi gerekir. `server/.env` dosyasında `JWT_SECRET` en az 32 karakter olmalıdır. SMTP değerleri `.env.example` dosyasında gösterilmiştir.
- Testler için önce kökte `npm ci`, sonra `npm --prefix server ci`, ardından `npm test` ve `npm run typecheck` çalıştırın.
## Kayıtlı e-posta alıcıları

- Admin, Ayarlar sayfasındaki **Mail gönderilecek kişiler** bölümünden ortak alıcı ekler veya kaldırır. Kullanıcı hesabı oluşturulmaz; bu bölüm yalnızca formun gönderileceği adresleri saklar.
- `server/data/recipients.json` kalıcı adres defteridir. İlk açılışta `kalite@example.com`, `uretim@example.com` ve `musteri@example.com` örnek olarak eklenir. Örnekler arayüzde işaretlenir; silinen adresler sonraki açılışta tekrar oluşturulmaz. Dosyayı kullanıcı kayıtlarıyla birlikte yedekleyin.
- Tüm giriş yapmış kullanıcılar önizleme/gönderim ekranında birden fazla kayıtlı alıcıyı işaretleyebilir. **Yeni e-posta** ile farklı adresler de aynı seçime eklenebilir; birden fazla yeni adres virgülle ayrılır. Seçimler **Uygula** ile kaydedilir, **Vazgeç** önceki alıcıları korur. Pencere telefon ve tablette ekran içine sığar; listesi kaydırılırken işlem düğmeleri görünür kalır. Seçim kişisel taslağa kaydedilir. Hiçbir alıcı kendiliğinden seçilmez; gönderim ayrıca onay ister.
- `GET /recipients` oturum gerektirir. `POST /admin/recipients` ve `DELETE /admin/recipients/:id` yalnızca admin içindir. İsteğe bağlı `RECIPIENTS_FILE` ile kayıt dosyasının yolu değiştirilebilir.
