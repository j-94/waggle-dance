// features/WaggleDance/components/GoalTabs.tsx

import { useCallback, useMemo } from "react";
import { default as NextLink } from "next/link";
import { useRouter } from "next/router";
import { Add, Close } from "@mui/icons-material";
import Box, { type BoxProps } from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import IconButton from "@mui/joy/IconButton";
import Stack from "@mui/joy/Stack";
import Tab from "@mui/joy/Tab";
import TabList from "@mui/joy/TabList";
import Tabs from "@mui/joy/Tabs";
import Typography from "@mui/joy/Typography";

import { type Goal } from "@acme/db";

import { api } from "~/utils/api";
import routes from "~/utils/routes";
import useGoalStore, {
  draftGoalPrefix,
  type GoalPlusExe,
} from "~/stores/goalStore";
import useWaggleDanceMachineStore from "~/stores/waggleDanceStore";

interface GoalTabProps extends BoxProps {
  tab: GoalPlusExe;
  index: number;
  goalList: GoalPlusExe[];
}

interface GoalTabsProps {
  children: React.ReactNode;
}

// A single goal tab inside the main tabber
const GoalTab: React.FC<GoalTabProps> = ({
  tab,
  index,
  goalList,
  ...props
}) => {
  const { isRunning, setIsRunning } = useWaggleDanceMachineStore();
  const { selectGoal, getGoalInputValue, deleteGoal, selectedGoal } =
    useGoalStore();
  const del = api.goal.delete.useMutation();
  // Function to handle closing a tab
  const closeHandler = useCallback(
    async (tab: Goal) => {
      setIsRunning(false);
      if (!tab.id.startsWith(draftGoalPrefix)) {
        // real delete on backend
        try {
          await del.mutateAsync(tab.id);
        } catch {
          // an ignorable data corruption
        }
      }
      deleteGoal(tab.id);
    },
    [del, deleteGoal, setIsRunning],
  );

  // Render a single goal tab
  return (
    <Box
      component={NextLink}
      onClick={() => {
        selectGoal(tab.id);
      }}
      {...props}
      sx={{
        opacity: isRunning ? 0.33 : 1,
        flex: "1 1 auto",
        maxWidth: `${100 / goalList.length}%`,
        minWidth: 0,
      }}
      href={routes.goal(tab.id)}
    >
      <Tab
        disabled={isRunning}
        value={index}
        component={Stack}
        color={"primary"}
        orientation="horizontal"
      >
        <IconButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void closeHandler(tab);
          }}
          variant="plain"
          className="flex-end float-start"
          size="sm"
          sx={{
            minWidth: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            minHeight: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            maxWidth: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
            maxHeight: { xs: "1.5rem", sm: "var(--IconButton-size, 2rem)" },
          }}
        >
          <Close
            sx={(theme) => ({
              color: theme.palette.text.primary,
            })}
          />
        </IconButton>
        <Typography
          level={"title-sm"}
          noWrap
          className="m-1 flex-grow p-1"
          fontWeight={selectedGoal?.id === tab.id ? "bold" : "normal"}
          fontStyle={tab.userId ? "normal" : "italic"}
          sx={{
            textOverflow: "ellipsis",
            textAlign: "center",
          }}
        >
          {selectedGoal?.id === tab.id ? (
            <>
              {getGoalInputValue().length > 0
                ? getGoalInputValue()
                : "New Goal"}
            </>
          ) : tab.prompt.length < 120 ? (
            tab.prompt.length > 0 ? (
              tab.prompt
            ) : (
              "New Goal"
            )
          ) : (
            `${tab.prompt.slice(0, 120)}…`
          )}
        </Typography>
      </Tab>
      <Divider orientation="vertical" />
    </Box>
  );
};

// The main goal tabber component
const GoalTabs: React.FC<GoalTabsProps> = ({ children }) => {
  const router = useRouter();
  const { goalMap, newGoal, selectedGoal } = useGoalStore();
  const { isRunning } = useWaggleDanceMachineStore();

  const goalList = useMemo(() => {
    return goalMap ? Object.values(goalMap) : [];
  }, [goalMap]);

  const currentTabIndex = useMemo(() => {
    return goalList.findIndex((goal) => goal.id === selectedGoal?.id);
  }, [goalList, selectedGoal?.id]);

  // Render the goal tabber
  return (
    <Tabs
      aria-label="Goal tabs"
      value={currentTabIndex}
      variant="outlined"
      color="primary"
      sx={{
        borderRadius: "lg",
        overflow: "clip",
        marginX: -2.1,
        marginTop: -2.1,
      }}
    >
      <TabList
        sticky="top"
        sx={(theme) => ({
          "--main-paddingTop": `calc(${theme.spacing(
            0,
          )} + var(--Header-height, 0px))`,
          pointerEvents: isRunning ? "none" : "auto",
          display: "flex flex-shrink",
          flexWrap: "nowrap",
          top: 0,
          zIndex: 101,
          width: "100%",
          overflow: "auto hidden",
          alignSelf: "flex-start",
          scrollSnapType: "inline",
          backgroundColor: isRunning
            ? theme.palette.background.level1
            : theme.palette.background.backdrop, // semi-transparent background
          backdropFilter: "blur(5px)", // blur effect
        })}
      >
        {goalList.map((tab, index) => (
          <GoalTab key={tab.id} tab={tab} index={index} goalList={goalList} />
        ))}
        <IconButton
          className="flex-end float-start"
          color="neutral"
          size="md"
          variant="plain"
          onClick={() => {
            const newId = newGoal();
            void router.replace(routes.goal(newId), undefined, {
              shallow: true,
            });
          }}
          sx={{ borderRadius: 0 }}
        >
          <Add />
        </IconButton>
      </TabList>
      <Box className="mx-6 mt-1">{children}</Box>
    </Tabs>
  );
};

export default GoalTabs;
