const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateRegister = (email, password) => {
  const errors = [];
  if (!email) errors.push('Email is required');
  else if (!validateEmail(email)) errors.push('Invalid email format');
  if (!password) errors.push('Password is required');
  else if (!validatePassword(password)) errors.push('Password must be at least 6 characters');
  return errors;
};

const validateLogin = (email, password) => {
  const errors = [];
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  return errors;
};

module.exports = { validateRegister, validateLogin };