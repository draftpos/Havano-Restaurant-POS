import { Spinner } from "./ui/spinner"

const Loader = ({text = "Loading..."}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center justify-center gap-2 bg-background p-4">
          <Spinner />
          <p>{text}</p>
        </div>
    </div>
  )
}

export default Loader