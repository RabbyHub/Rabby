function request(method, params) {
  // return fetch(url)

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('success sign', method, params)
    }, 3000);
  })
}

export default request;
