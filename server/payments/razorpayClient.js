import crypto from"crypto";import Razorpay from"razorpay";
export class PaymentConfigError extends Error{}
function env(){const keyId=process.env.RAZORPAY_KEY_ID,keySecret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!keySecret)throw new PaymentConfigError("Online payment is temporarily unavailable.");return{keyId,keySecret}}
export function publicKey(){const{keyId}=env();if(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID&&process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!==keyId)throw new PaymentConfigError("Online payment configuration is inconsistent.");return keyId}
function client(){const{keyId,keySecret}=env();return new Razorpay({key_id:keyId,key_secret:keySecret})}
export const createRazorpayOrder=input=>client().orders.create(input);export const fetchRazorpayPayment=id=>client().payments.fetch(id);
function safeEqual(expected,received){try{const a=Buffer.from(expected,"hex"),b=Buffer.from(String(received||""),"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
export function verifyCheckoutSignature(orderId,paymentId,signature){const{keySecret}=env();return safeEqual(crypto.createHmac("sha256",keySecret).update(`${orderId}|${paymentId}`).digest("hex"),signature)}
export function verifyWebhookSignature(raw,signature){const secret=process.env.RAZORPAY_WEBHOOK_SECRET;if(!secret)throw new PaymentConfigError("Webhook is not configured.");return safeEqual(crypto.createHmac("sha256",secret).update(raw).digest("hex"),signature)}
export const hashValue=value=>crypto.createHash("sha256").update(value).digest("hex");
