// GoalInput.tsx

import React, { useCallback, useEffect, useState } from "react";
import router from "next/router";
import { KeyboardArrowRight } from "@mui/icons-material";
import { Link, List } from "@mui/joy";
import Box from "@mui/joy/Box";
import Button from "@mui/joy/Button";
import { type CardProps } from "@mui/joy/Card";
import Checkbox from "@mui/joy/Checkbox";
import Divider from "@mui/joy/Divider";
import FormControl from "@mui/joy/FormControl";
// import Grid from "@mui/joy/Grid";
import Stack from "@mui/joy/Stack";
import Textarea from "@mui/joy/Textarea";
import Typography from "@mui/joy/Typography";
import { TRPCClientError } from "@trpc/client";
import { stringify } from "superjson";

import { examplePrompts } from "@acme/agent";
import { type AutoRefineFeedback } from "@acme/api/utils";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useApp from "~/stores/appStore";
import useGoalStore from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";
import AutoRefineGoalToggle from "../GoalMenu/components/AutoRefineGoalToggle";
import GoalSettings from "../GoalMenu/components/GoalSettings";
import TemplatesModal from "../GoalMenu/components/TemplatesModal";
import AutoRefineFeedbackList from "./AutoRefineGoalFeedbackList";

const placeholders = ["What's your goal? …Not sure? Check Examples!"];

type GoalPromptInputProps = CardProps;

export default function GoalPromptInput({}: GoalPromptInputProps) {
  const { getGoalInputValue, setGoalInputValue, upsertGoal, selectedGoal } =
    useGoalStore();
  const { isAutoStartEnabled, setIsAutoStartEnabled } =
    useWaggleDanceMachineStore();
  const {
    isPageLoading,
    setIsPageLoading,
    isAutoRefineEnabled: _isAutoRefineEnabled,
    setError,
  } = useApp();
  const [_currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [templatesModalOpen, setTemplatesModalOpen] = useState<boolean>(false);
  const [feedback, _setFeedback] = useState<AutoRefineFeedback | null>(null);

  const { mutate: createGoal } = api.goal.create.useMutation({});
  const { mutate: refineGoal } = api.goal.refine.useMutation({});
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setIsPageLoading(true);
      const previousGoalId = selectedGoal?.id;

      function innerCreateGoal(prompt: string) {
        createGoal(
          { prompt },
          {
            onSuccess: (goal) => {
              console.debug(
                "saved goal, previousGoalId: ",
                previousGoalId,
                "goal: ",
                goal,
              );
              upsertGoal(goal, previousGoalId);
              void router.push(routes.goal({ id: goal.id }), undefined, {
                shallow: true,
              });
            },
            onError: (e) => {
              type HTTPStatusy = { httpStatus: number };
              if (e instanceof TRPCClientError) {
                const data = e.data as HTTPStatusy;
                // route for anonymous users
                if (data.httpStatus === 401 && selectedGoal) {
                  // this is a bit of terrible code that makes the state update to be able to waggle
                  selectedGoal.userId = "guest";
                  upsertGoal(selectedGoal);
                  void router.push(
                    routes.goal({ id: selectedGoal.id }),
                    undefined,
                    {
                      shallow: true,
                    },
                  );
                  return;
                }
              }
              if (e instanceof Error) {
                setError(e);
              }
              setIsPageLoading(false);
            },
          },
        );
      }

      if (_isAutoRefineEnabled) {
        refineGoal(
          { goal: getGoalInputValue() },
          {
            onSettled: (data, error: unknown) => {
              if (error || !data) {
                setIsPageLoading(false);
                if (error instanceof Error) {
                  setError(error);
                }
              } else {
                const { feedback, combinedRefinedGoal: _combinedRefinedGoal } =
                  data || {
                    feedback: [],
                    combinedRefinedGoal: "",
                  };

                if (feedback) {
                  const errorFeedback = feedback.find(
                    (f) => f.type === "error",
                  );
                  if (errorFeedback) {
                    setIsPageLoading(false);
                    setError(new Error(stringify(errorFeedback)));
                  } else {
                    debugger;
                    // setFeedback(da);
                  }
                }
              }
            },
          },
        );
      } else {
        // setIsAutoStartEnabled(true);
        // this saves the goal to the database and routes to the goal page
        // unless the user is not logged in, in which case it routes to the goal page
        innerCreateGoal(getGoalInputValue());
      }
    },
    [
      setIsPageLoading,
      selectedGoal,
      _isAutoRefineEnabled,
      createGoal,
      upsertGoal,
      setError,
      refineGoal,
      getGoalInputValue,
    ],
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGoalInputValue(event.target.value);
  };

  const handleAutostartChanged = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsAutoStartEnabled(event.target.checked);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPromptIndex((prevIndex) =>
        prevIndex + 1 >= examplePrompts.length ? 0 : prevIndex + 1,
      );
      setCurrentPlaceholderIndex((prevIndex) =>
        prevIndex + 1 >= placeholders.length ? 0 : prevIndex + 1,
      );
    }, 5000); // The tooltip title will change every 5 seconds.

    return () => clearInterval(timer);
  }, []);

  return (
    <Box className="relative">
      <form onSubmit={handleSubmit} className="my-3 space-y-2 pb-2">
        <FormControl disabled={isPageLoading}>
          <Textarea
            autoFocus
            id="goalTextarea"
            name="goalTextarea"
            placeholder={placeholders[currentPlaceholderIndex]}
            minRows={3}
            maxRows={10}
            size="lg"
            required
            variant="outlined"
            className="py-col flex-grow pb-10"
            onKeyPress={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
            value={getGoalInputValue()}
            onChange={handleChange}
            sx={{
              paddingTop: "1rem",
              "--Textarea-paddingBlock": "4rem",
            }}
          >
            {/* <Box className="min-h-28"></Box> */}
          </Textarea>
        </FormControl>
      </form>
      <Box
        className="absolute"
        sx={{
          bottom: { xs: "7rem", sm: "6rem" },
          left: "1rem",
        }}
      >
        <Stack direction="row" gap="0.5rem">
          <Button
            size="sm"
            variant="outlined"
            color="neutral"
            disabled={getGoalInputValue().trim().length === 0}
            onClick={() => {
              setGoalInputValue("");
            }}
            sx={{
              marginRight: -0.4,
              paddingX: { xs: 0.5, sm: 2 },
              borderRadius: 2,
            }}
          >
            Clear
          </Button>
          <Divider orientation="vertical" />
          <TemplatesModal
            open={templatesModalOpen}
            setOpen={setTemplatesModalOpen}
          >
            <Typography color="neutral" level="title-lg" className="px-5">
              Examples
            </Typography>
            <Typography level="body-md" className="px-5 pb-2">
              For better results, try to{" "}
              <Link
                href="https://platform.openai.com/docs/guides/gpt-best-practices"
                target="_blank"
                rel="noopener noreferrer"
              >
                follow GPT best practices
              </Link>
            </Typography>
            <List className="absolute left-0 top-0 mt-3">
              <Stack spacing={2}>
                {examplePrompts
                  .sort((a, b) => (a.length < b.length ? 1 : -1))
                  .map((prompt, _index) => (
                    <Stack key={prompt}>
                      <Button
                        color="neutral"
                        size="sm"
                        variant="outlined"
                        className="flex flex-grow flex-row justify-center"
                        onClick={() => {
                          setGoalInputValue(prompt);
                          setTemplatesModalOpen(false);
                        }}
                      >
                        <Typography
                          level="body-sm"
                          className="flex flex-grow flex-row justify-center"
                        >
                          {prompt}
                        </Typography>
                      </Button>
                    </Stack>
                  ))}
              </Stack>
            </List>
          </TemplatesModal>
          <Divider orientation="vertical" />
          <AutoRefineGoalToggle />
        </Stack>
      </Box>
      <AutoRefineFeedbackList feedback={feedback} />
      <Box className="max-w-screen flex items-center justify-end">
        <Stack direction="row-reverse" gap="1rem" className="pb-4">
          <Button
            loading={isPageLoading}
            className="col-end mt-2"
            type="submit"
            variant="soft"
            disabled={getGoalInputValue().trim().length === 0}
            onClick={handleSubmit}
          >
            Next
            <KeyboardArrowRight />
          </Button>
          <Box
            className="items-center justify-center text-center align-top"
            component={Stack}
            gap={0.5}
          >
            <Checkbox
              size="sm"
              checked={isAutoStartEnabled}
              onChange={handleAutostartChanged}
              label={<Typography>Autostart Goal</Typography>}
            >
              Autostart
            </Checkbox>

            <Divider />
            <GoalSettings />
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}