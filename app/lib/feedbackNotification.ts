/** Email delivery is optional; an absent provider must never lose user feedback. */
export const FEEDBACK_NOTIFICATION_TO = "info@qalamworks.com";
export async function notifyFeedback(entry:{tool:string;rating:string;comment:string;createdAt:string}, env:Record<string,string|undefined>=process.env, send:typeof fetch=fetch):Promise<"sent"|"not-configured"|"failed"> {
 const key=env.RESEND_API_KEY;
 const from=env.QALAM_FEEDBACK_FROM_EMAIL;
 if(!key||!from)return "not-configured";
 const labels:Record<string,string>={helpful:"بہت فائدہ ہوا",partial:"کچھ فائدہ ہوا، اصلاح چاہیے","not-helpful":"کام نہیں آیا"};
 const text=["قلم ورکس: صارف کی نئی رائے", "اوزار: "+entry.tool,"رائے: "+(labels[entry.rating]??entry.rating),"وقت: "+entry.createdAt,entry.comment?"تجویز: "+entry.comment:"کوئی اضافی تبصرہ نہیں"].join("\n");
 try{
  const response=await send("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({from,to:[FEEDBACK_NOTIFICATION_TO],subject:"قلم ورکس — "+entry.tool+" کی نئی رائے",text}),
   signal:AbortSignal.timeout(8000),
  });
  return response.ok?"sent":"failed";
 }catch{return "failed";}
}
