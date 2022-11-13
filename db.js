const forms = [];

exports.save = function(form){
  let phone = form['phone'];
  form['timestamp'] = new Date();
  form['id'] = forms.length;
  forms.push(form);
  console.log(forms);
};

exports.findAll = function(form){
  let result = [...forms];
  return result.reverse();
};

exports.findByID = function(id){
  return forms[id];
};

exports.findByPhone = function(phone){
  let result = [];
  for(let i=0;i< forms.length;i++){
    let form = forms[i];
    if (form['phone'] == phone){
      result.push(form);
    }
  }
  return result.reverse();
};
