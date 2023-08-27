import Task from './Task'

const Tasks = ({tasks, deleteTask, highlightTask }) =>
{
    return (
        <div className="tasks">
            {
            tasks.map((task) =>(
            <Task key={task.id} task={task} deleteTask={deleteTask} highlightTask={highlightTask} />
            ))
            }
        </div>
    );
}

export default Tasks;
