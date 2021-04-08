function request(method, params) {
  // return fetch(url)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('hello from request')
    }, 3000);
  })
}

export default request;
