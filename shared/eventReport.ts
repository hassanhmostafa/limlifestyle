/** Quote every cell and neutralize spreadsheet formulas in user-supplied text. */
export function csvCell(value: unknown) {
  let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);
  if (/^[\s]*[=+@-]/.test(text)) text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function eventReportCsv(records:Record<string,unknown>[]) {
  const fields=[['code','مرجع الزيارة'],['name','الاسم'],['phone','الجوال'],['age','العمر'],['sex','الجنس'],['trackId','المسار'],['createdAt','تاريخ التسجيل'],['recordNo','مرجع تحليل الجسم'],['nursingCompletedAt','اعتماد التمريض'],['approvedAt','اعتماد الطبيب'],['doctorName','الطبيب'],['advice','نصائح الطبيب'],['measurements','قياسات التمريض'],['answers','إجابات الاستبيان']] as const;
  return '\uFEFF'+[fields.map(([,label])=>csvCell(label)).join(','),...records.map(row=>fields.map(([key])=>csvCell(row[key])).join(','))].join('\r\n');
}
