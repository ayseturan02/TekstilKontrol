import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
import {generatePDF} from 'react-native-html-to-pdf';
import {htmlFor} from '../report';
import {isValidEmail, mailBody, mailSubject, mergeEmails, normalizeEmail, parseSavedEmails} from '../../shared/recipients';

// Address book stored only on this phone (shared by every account on the device).
export const SAVED_EMAILS_KEY = 'mail-recipients-v1';

export async function loadSavedEmails(): Promise<string[]> {
  return parseSavedEmails(await AsyncStorage.getItem(SAVED_EMAILS_KEY));
}

export async function rememberEmails(emails: string[]): Promise<string[]> {
  const next = mergeEmails(await loadSavedEmails(), emails);
  await AsyncStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(next));
  return next;
}

export async function forgetEmail(email: string): Promise<string[]> {
  const target = normalizeEmail(email);
  const next = (await loadSavedEmails()).filter(item => item !== target);
  await AsyncStorage.setItem(SAVED_EMAILS_KEY, JSON.stringify(next));
  return next;
}

export function parseRecipients(value: unknown): string[] {
  return mergeEmails([], String(value || '').split(',')).filter(isValidEmail);
}

/** Opens the phone's mail app with a ready draft; the user only presses Send. */
export async function openMailDraft(report: any, recipients: string[]): Promise<void> {
  const media = (report.media || []).map((item: any) => item?.uri).filter((uri: any) => typeof uri === 'string' && /^(file|content):/.test(uri));
  const pdf=await generatePDF({html:htmlFor(report),fileName:'Kontrol-Raporu',base64:true,width:595.28,height:841.89,padding:0});
  if(!pdf.base64||!pdf.base64.startsWith('JVBER'))throw Error('PDF oluşturulamadı. Lütfen tekrar deneyin.');
  const options = {
    title: 'Mail uygulamasını seçin',
    email: recipients.join(','),
    subject: mailSubject(report),
    message: mailBody(report, media.length),
    // Keep the PDF first: filenames are matched to urls by index.
    urls: ['data:application/pdf;base64,' + pdf.base64, ...media],
    filenames: ['Kontrol-Raporu.pdf'],
    failOnCancel: false,
    useInternalStorage: true,
  };
  try {
    await Share.shareSingle({
      ...options,
      social: Share.Social.EMAIL as any,
    });
  } catch {
    await Share.open(options);
  }
}
