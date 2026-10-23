import AsyncStorage from '@react-native-async-storage/async-storage';
import Share from 'react-native-share';
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

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// UTF-8 safe base64 without relying on Buffer/btoa being available in Hermes.
export function utf8Base64(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

/** Opens the phone's mail app with a ready draft; the user only presses Send. */
export async function openMailDraft(report: any, recipients: string[]): Promise<void> {
  const media = (report.media || []).map((item: any) => item?.uri).filter((uri: any) => typeof uri === 'string' && /^(file|content):/.test(uri));
  const options = {
    title: 'Mail uygulamasını seçin',
    email: recipients.join(','),
    subject: mailSubject(report),
    message: mailBody(report, media.length),
    // The HTML report must stay first: filenames are matched to urls by index.
    urls: ['data:text/html;base64,' + utf8Base64(htmlFor(report)), ...media],
    filenames: ['Kontrol-Raporu.html'],
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
