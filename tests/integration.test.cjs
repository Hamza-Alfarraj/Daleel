const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto').webcrypto;
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {initializeApp,deleteApp}=require('firebase/app');
const A=require('firebase/auth'),F=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-daleel',firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync('firestore.rules','utf8')}});await env.clearFirestore();
 const app=initializeApp({projectId:'demo-daleel',apiKey:'demo-key',authDomain:'demo-daleel.firebaseapp.com'},'integration');const auth=A.getAuth(app),db=F.getFirestore(app);A.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});F.connectFirestoreEmulator(db,'127.0.0.1',8085);
 const email='integration-'+Date.now()+'@example.com',password='ActualQaPassword123!';let checks=0;
 const credential=await A.createUserWithEmailAndPassword(auth,email,password);const uid=credential.user.uid;await A.updateProfile(credential.user,{displayName:'Integration Traveler'});
 await F.setDoc(F.doc(db,'users',uid),{uid,email,fullName:'Integration Traveler',username:'integration',bio:'Traveler profile',city:'Amman',travelMood:'food',photoData:'',onboardingCompleted:true,createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});checks++;
 await A.signOut(auth);assert.equal(auth.currentUser,null);checks++;
 await A.signInWithEmailAndPassword(auth,email,password);assert.equal(auth.currentUser.uid,uid);checks++;
 await F.updateDoc(F.doc(db,'users',uid),{bio:'Edited profile persists',updatedAt:F.serverTimestamp()});await A.signOut(auth);await A.signInWithEmailAndPassword(auth,email,password);assert.equal((await F.getDoc(F.doc(db,'users',uid))).data().bio,'Edited profile persists');checks++;
 const x={hostUid:'host',titleAr:'تجربة حقيقية',titleEn:'Real local tour',descriptionAr:'تفاصيل تجربة محلية مع تعليمات السلامة ونقطة لقاء واضحة ومتطلبات الزيارة.',descriptionEn:'A real local tour with safety instructions and clear meeting details.',placeId:'petra',regionId:'maan',category:'tour',status:'approved',priceCents:2500,duration:60,communityBps:1000,photoData:'',createdAt:F.Timestamp.now(),updatedAt:F.Timestamp.now()};
 const start=F.Timestamp.fromMillis(Date.now()+96*3600000),end=F.Timestamp.fromMillis(start.toMillis()+3600000);
 await env.withSecurityRulesDisabled(async ctx=>{const d=ctx.firestore();await F.setDoc(F.doc(d,'hosts','host'),{uid:'host',verified:true});await F.setDoc(F.doc(d,'experiences','exp'),x);await F.setDoc(F.doc(d,'slots','slot'),{experienceId:'exp',hostUid:'host',regionId:'maan',titleAr:x.titleAr,titleEn:x.titleEn,capacity:2,booked:0,priceCents:2500,communityBps:1000,startAt:start,endAt:end,open:true,lastBookingId:''});});
 globalThis.__daleelIntegrationDb=db;
 const source=fs.readFileSync('JS/app/data.js','utf8').replace(/import\s*\{\s*db\s*\}\s*from\s*['"]\.\.\/firebase-config\.js['"];\s*/,"const db=globalThis.__daleelIntegrationDb;\n").replace('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js',require('node:url').pathToFileURL(require.resolve('firebase/firestore')).href);
 const D=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let input={uid,slotId:'slot',guests:2,travelerName:'Integration Traveler'};
 const bid=await D.reserve(input);assert.equal((await F.getDoc(F.doc(db,'slots','slot'))).data().booked,2);checks++;
 await assert.rejects(D.reserve(input),/slot-full/);checks++;
 await D.cancelBooking(bid,uid);assert.equal((await F.getDoc(F.doc(db,'slots','slot'))).data().booked,0);checks++;
 const second=await D.reserve(input);assert.notEqual(second,bid,'cancelled slot can be rebooked with a new reservation ID');checks++;
 await assert.rejects(D.reserve({...input,guests:999}),/slot-full/);checks++;
 await D.cancelBooking(second,uid);
 // Generic paged reads do not silently drop saved trips or contribution records.
 for(let i=0;i<5;i++)await F.setDoc(F.doc(db,'trips','trip'+i),{uid,name:'Integration trip '+i,startDate:'2026-12-10',days:3,stops:[],status:'planned',createdAt:F.serverTimestamp(),updatedAt:F.serverTimestamp()});const trips=await D.list('trips',[['uid',uid]],2);assert.equal(trips.length,5);checks++;

 await A.deleteUser(auth.currentUser);await F.terminate(db);await deleteApp(app);await env.cleanup();console.log(`PASS ${checks} actual application data-module integration checks with Firebase Auth/Firestore emulators: registration, manual login, profile persistence, reserve/cancel/rebook and pagination`);
})().catch(err=>{console.error(err);process.exit(1);});
