// pages/goal/[slug].tsx
import { Suspense, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { Stack, Typography } from "@mui/joy";
import { CircularProgress } from "@mui/material";

import { api } from "~/utils/api";
import { app } from "~/constants";
import GoalInput from "~/features/GoalMenu/components/GoalInput";
import MainLayout from "~/features/MainLayout";
import Title from "~/features/MainLayout/components/PageTitle";
import { ExecutionSelect } from "~/features/WaggleDance/components/ExecutionSelect";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

export default function GoalTab() {
  const router = useRouter();
  const { isRunning } = useWaggleDanceMachineStore();
  const { replaceGoals, getSelectedGoal, newGoal } = useGoalStore();

  const [savedGoals, suspense] = api.goal.topByUser.useSuspenseQuery(
    undefined,
    {
      refetchOnMount: false,
    },
  );

  const cleanedSlug = useMemo(() => {
    const { slug } = router.query;
    if (typeof slug === "string") {
      return slug;
    } else if (Array.isArray(slug)) {
      return slug[0];
    } else {
      return slug;
    }
    return "";
  }, [router.query]) as string;

  const selectedGoal = useMemo(
    () => getSelectedGoal(cleanedSlug),
    [getSelectedGoal, cleanedSlug],
  );
  useEffect(
    () => {
      console.log("savedGoals", savedGoals);
      replaceGoals(savedGoals);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedGoals],
  );

  const state = useMemo(() => {
    if (cleanedSlug === "" || cleanedSlug === "/") {
      return "input";
    }
    return (selectedGoal?.executions?.length ?? 0 > 0) ||
      (selectedGoal?.userId.trim().length ?? 0 !== 0)
      ? "graph"
      : "input";
  }, [cleanedSlug, selectedGoal?.executions?.length, selectedGoal?.userId]);
  useEffect(
    () => {
      if (!router.isReady || cleanedSlug === "new") {
        // do nothing
      } else {
        if (selectedGoal && selectedGoal.executions.length > 0) {
          const route = app.routes.goal(selectedGoal.id); // avoid an error when replacing route to same route
          if (router.route !== route) {
            // Only replace route if it's different from the current route
            void router.replace(route);
          }
          return;
        }
        // if the slug is not the same as the selected goal, then we need to update the selected goal
        if (!selectedGoal?.id && cleanedSlug !== selectedGoal?.id) {
          const anySelectedGoal = getSelectedGoal()?.id;
          // if there is a selected goal, then we should redirect to that goal
          if (anySelectedGoal) {
            void router.replace(app.routes.goal(anySelectedGoal));
          } else if (savedGoals?.[0]?.id) {
            // if there is a goal in the in-memory list, then we should redirect to that goal
            const firstGoalId = savedGoals?.[0]?.id;
            void router.replace(app.routes.goal(firstGoalId));
          } else if (savedGoals?.[0]) {
            // if there is a goal in the database, then we should redirect to that goal
            const savedGoalId = savedGoals?.[0]?.id;
            void router.replace(app.routes.goal(savedGoalId));
          } else {
            // otherwise, we should create a new goal
            const newId = newGoal();
            void router.replace(app.routes.goal(newId));
          }
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedGoals, selectedGoal?.id],
  );

  const executions = selectedGoal?.executions;

  return (
    <MainLayout>
      <>
        {state === "input" ? (
          <>
            <Title title="🐝 Goal solver" />
            <GoalInput />
          </>
        ) : (
          <>
            <Title title={isRunning ? "💃 Waggling!" : "💃 Waggle"}>
              <Stack direction="row">
                <Typography
                  level="body2"
                  sx={{
                    userSelect: "none",
                    marginBottom: { xs: -1, sm: 0 },
                  }}
                >
                  {isRunning
                    ? "Please 🐝 patient. Planning may take several minutes to fully complete."
                    : "Press start/resume to waggle or add data."}
                </Typography>
                <Typography className="flex-row">Yo</Typography>
              </Stack>
            </Title>

            <Suspense fallback={<CircularProgress></CircularProgress>}>
              <ExecutionSelect
                executions={executions}
                className="flex justify-start"
              />
              <WaggleDanceGraph key={cleanedSlug} selectedGoal={selectedGoal} />
            </Suspense>
          </>
        )}
      </>
    </MainLayout>
  );
}
