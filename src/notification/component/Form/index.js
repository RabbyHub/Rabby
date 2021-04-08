import { createContext, useContext } from 'react';

export const formContextMap = new Map();
let formId = 1000;

const Form = ({ children }) => {
  formId++;
  const formContext = useContext(FormContext);

  return <form>{children}</form>
}

export default Form;
