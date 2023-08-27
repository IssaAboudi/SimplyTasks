import { FaTimes } from 'react-icons/fa'
import { FaRegArrowAltCircleDown, FaRegArrowAltCircleUp,
	FaRegArrowAltCircleLeft, FaRegArrowAltCircleRight, FaListUl} from 'react-icons/fa';

import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';

const Task = ({task, deleteTask, highlightTask }) => {

		// Task objects display their contents and handle their own deletion


		const {
			attributes,
			listeners,
			setNodeRef,
			transform,
			transition,

		} = useSortable(
			{id: task.id});

		const style = {
			transform: CSS.Transform.toString(transform),
			transition,
		};



		// onDoubleClick conflict with Click so add separate mechanism for show subtasks
		// which honestly looks amazing
		return (
			<>

			<div ref={setNodeRef} style={style} className={`task ${task.highlight ? 'highlight' : ''}`} onClick={()=>highlightTask(task.id)}>

			<h3>{task.content} <div>
			<FaListUl className="drag-and-drop" {...attributes} {...listeners}/> 
			<FaTimes className='X' onClick={(e) => deleteTask(e, task.id)} />
			</div>
			</h3>
			<h5>
			{task.date} 
			</h5>
			</div>
			</>
			


       // setTasks(
        //     tasks.map((task) => task.id === id ? {...task, showSubtasks: !task.showSubtasks, showSubtaskAdder: false} : task)
        // )

		);
	}

export default Task;
