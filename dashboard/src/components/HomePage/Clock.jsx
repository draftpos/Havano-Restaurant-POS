import { useEffect,useState } from "react";

import { getCurrentDateTime } from "@/lib/utils";

const Clock = () => {
  const [dateTime, setDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(getCurrentDateTime());
    }, 1000); // update every second

    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  return (
    <div className="flex flex-col items-end">
      <p className="text-2xl font-mono">{dateTime.time}</p>
      <p className="text-xs text-gray-500">{dateTime.date}</p>
    </div>
  );
};

export default Clock;
