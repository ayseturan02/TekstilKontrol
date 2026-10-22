export type PaperField = {path:string;label:string;x:number;y:number;w:number;h:number;multiline?:boolean;numeric?:boolean};
export const layout: {fields:PaperField[];choices:{path:string;code:string;label:string;multiple:boolean}[]};
export function buildPaperDocument(data:any,options?:{editable?:boolean;showAttachments?:boolean;showSend?:boolean}):string;
export function valueAt(data:any,path:string):any;

export function layoutForReport(data:any): {height:number;fields:PaperField[];choices:any[];texts:any[];lines:any[]};
