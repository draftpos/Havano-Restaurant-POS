import { RouterProvider } from 'react-router-dom'

import router from './routes'
// import { FrappeProvider } from "frappe-react-sdk"

function App() {

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
