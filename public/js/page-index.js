// "At a talk? Enter its code": straight to that talk's questions page.
document.getElementById('joinbox').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = document.getElementById('joincode').value.replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (code.length >= 4) location.href = '/j/' + code;
  else document.getElementById('joincode').focus();
});
