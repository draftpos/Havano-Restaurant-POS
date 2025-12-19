import { useCallback, useEffect, useState } from "react";
import { createAgent, getAgents } from "@/lib/utils";

const useAgents = () => {
	const [agents, setAgents] = useState([]);

	const [isFetchingAgents, setIsFetchingAgents] = useState(false);
	const [fetchAgentsError, setFetchAgentsError] = useState(null);

	const [isCreatingAgent, setIsCreatingAgent] = useState(false);
	const [createAgentError, setCreateAgentError] = useState(null);

	const fetchAgents = useCallback(async () => {
		try {
			setIsFetchingAgents(true);
			setFetchAgentsError(null);

			const res = await getAgents();
			// `getAgents()` returns the message payload directly (not an envelope),
			// so guard for both shapes for compatibility with compiled/public code.
			setAgents((res && (res.message || res)) || []);
		} catch (err) {
			console.error("Failed to fetch agents:", err);
			setFetchAgentsError(err);
		} finally {
			setIsFetchingAgents(false);
		}
	}, []);

	const makeAgent = useCallback(
		async (full_name, certificate_no = null, qualification = null) => {
			try {
				setIsCreatingAgent(true);
				setCreateAgentError(null);

				const res = await createAgent(full_name, certificate_no, qualification);

				await fetchAgents();
				return res;
			} catch (err) {
				console.error("Failed to create agent:", err);
				setCreateAgentError(err);
				throw err;
			} finally {
				setIsCreatingAgent(false);
			}
		},
		[fetchAgents]
	);

	useEffect(() => {
		fetchAgents();
	}, [fetchAgents]);

	return {
		// data
		agents,
		setAgents,

		// fetch state
		isFetchingAgents,
		fetchAgentsError,

		// create state
		isCreatingAgent,
		createAgentError,

		// actions
		fetchAgents,
		makeAgent,
	};
};

export default useAgents;
