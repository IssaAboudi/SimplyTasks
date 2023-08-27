import TaskListHeader from './TaskListHeader'
import Tasks from './Tasks'
import TaskAdder from './TaskAdder'
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors, MeasuringStrategy,
} from '@dnd-kit/core';
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { UsrColRef, db } from "../../backend/firebase"
import { doc, query, collection, getDocs, onSnapshot,
	addDoc, updateDoc, deleteDoc, getDoc, collectionGroup } from "firebase/firestore"
import {useEffect, useRef, useState} from "react";

export default TaskList;


function TaskList ({currentUser, setCurrentPage, tasks, setTasks}) {

	// Should we process the backend
	const [process, doProcess] = useState(false);

	//Run when we first log in
	useEffect(() => {
		if(currentUser == ""){
			console.log("Current User Not Set");
			setCurrentPage('log-in'); //if we have bad user and somehow made it through,
			// we should go back to login page
		}

		console.log("Current user: " + currentUser);
	}, [])

	//Run on changes
	useEffect(() => {

		//get the current user in the database
		const docRef = doc(db, "Users", currentUser);
		//get the Tasks collection on current user
		const colRef = collection(docRef, "Tasks");

		const unsubList = []; // we want to be able to kill all our event listeners at the end of every update
		// we don't want these persisting.

		const unsub = onSnapshot(colRef, (Tasks) => {
			//loop through all tasks in db and store in local array
			let temp = [];

			Tasks.docs.forEach((task) => {
				let taskData = task.data();

				//add tasks to a local array object with correct structure
				temp.push(taskData);
			});

			const final = sortTasks(temp, sortMethod.current); //sort it
			setTasks(final); //final tasks array

			doProcess(false); //we're done processing
		});
		unsubList.push(unsub);

		return () => unsubList.forEach((unsub) => unsub());
	},[process]);


	// will show TaskAdder
	const [showAdder, setShowAdder] = useState(false);
	// keeps track of how tasks are currently being sorted
	const sortMethod = useRef('Sort by: Recently Added');

	//==========Sorting================

	const sortTasksByTimeAdded = (task1, task2) =>{
		if(task1.timeAdded < task2.timeAdded)
			return 1;
		else
			return -1;
	}

	const sortTasksByHighlight = (task1, task2) => {
		if(task1.highlight && task2.highlight)
			return 0;
		if(task1.highlight)
			return -1;
		if(task2.highlight)
			return 1;

		return 0;
	}

	const sortTasksByDueDate = (task1, task2) => {
		if(task1.date === task2.date)
			return 0;
		if(task1.date === '')
			return 1;
		if(task2.date === '')
			return -1;


		const task1Year = task1.date.substr(6, 10);
		const task2Year = task2.date.substr(6, 10);

		const task1Month = task1.date.substr(0, 2).padStart(2, "0");
		const task2Month = task2.date.substr(0, 2).padStart(2, "0");

		const task1Day = task1.date.substr(3, 5).padStart(2, "0");
		const task2Day = task2.date.substr(3, 5).padStart(2, "0");

		const score1 = parseInt(`${task1Year}${task1Month}${task1Day}`);
		const score2 = parseInt(`${task2Year}${task2Month}${task2Day}`);

		if(score1 < score2) return -1;
		else if (score1 > score2) return 1;
		return 0;
	}

	const sortTasks = (currentTasks, sortMethod) => {
		// console.log('calling sortTasks()');

		if(sortMethod === 'Sort by: Highlighted'){
			currentTasks.sort(sortTasksByHighlight);
		}
		else if (sortMethod === 'Sort by: Due Date'){
			currentTasks.sort(sortTasksByDueDate);
		}
		else if (sortMethod === 'Sort by: Recently Added')
		{
			currentTasks.sort(sortTasksByTimeAdded);
		}

		return currentTasks;
	}

	const changeSortMethod = () => {
		let newSortMethod = '';
		if(sortMethod.current === 'Sort by: Recently Added'){
			newSortMethod = 'Sort by: Due Date';
		}
		else if(sortMethod.current === 'Sort by: Due Date'){
			newSortMethod = 'Sort by: Highlighted';
		}
		else if(sortMethod.current === 'Sort by: Highlighted'){
			newSortMethod = 'Sort by: Recently Added';
		} else if(sortMethod.current === 'Sort by: Manual'){
			newSortMethod = 'Sort by: Recently Added';
		}

		sortMethod.current = newSortMethod;
		let currentTasks = [...tasks];
		setTasks(sortTasks(currentTasks, newSortMethod));
	}

	//this function returns an ID which specifies when it was created
	//and is used to sort the tasks by time created
	function getCurrentTimeID() {
		let now = new Date();
		let year = now.getUTCFullYear().toString();
		let month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
		let day = now.getUTCDate().toString().padStart(2, "0");
		let hour = now.getUTCHours().toString().padStart(2, "0");
		let minute = now.getUTCMinutes().toString().padStart(2, "0");
		let second = now.getUTCSeconds().toString().padStart(2, "0");
		let id = parseInt(`${year}${month}${day}${hour}${minute}${second}`);
		return id;
	}

	//===========Actions================

	const deleteTask = async (e, id) => {
		e.stopPropagation();

		await deleteDoc(doc(db, "Users", currentUser, "Tasks", id));

	}

	const highlightTask = async (id) => {

		const docRef = await getDoc(doc(db, "Users", currentUser, "Tasks", id))
		if(!docRef.exists()){
			console.log("Document not found");
			return;
		}

		const data = docRef.data()
		const highlight = data.highlight;

		await updateDoc(doc(db, "Users", currentUser, "Tasks", id), { highlight: !highlight});
		doProcess(true); //process db
	}

	const addTask = async (task) => {
		const highlight = false;

		const tempRef = await addDoc(collection(doc(db, "Users", currentUser), "Tasks"),
			{
				...task,
				highlight: highlight,
				timeAdded: getCurrentTimeID(),
			});
		//get ID from firebase and add it as ID
		await updateDoc(doc(db, "Users", currentUser, "Tasks", tempRef.id), {id: tempRef.id});
		doProcess(true); //process db
	}


	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);


	function handleDragEnd(event) {
		const {active, over} = event;

		//console.log("check1",active,over);

		if (active.id !== over.id) {



			setTasks((items) => {
				console.log("D", items)
				const oldIndex = items.findIndex((o) => {
					if(o.id == active.id){
						return true
					} else {
						return false;
					}
				});
				const newIndex =  items.findIndex((n) => {
					if(n.id == over.id){
						return true
					} else {
						return false;
					}
				});
				console.log("checkB",oldIndex, newIndex);
				return arrayMove(tasks, oldIndex, newIndex); //swap 0 and 2
			});



		}
	}

	const handleDragStart = () =>{

		sortMethod.current = "Sort by: Manual";
		///changeSortMethod()

	}

	return (
		<>
		<div className="container">
		<TaskListHeader setAdder={() => setShowAdder(true)} changeSort={changeSortMethod} sortMethod={sortMethod.current}/>
		{showAdder && <TaskAdder addTask={addTask} unsetAdder={() => setShowAdder(false)} /> }

		<DndContext
		sensors={sensors}
		collisionDetection={closestCenter}
		onDragEnd={handleDragEnd}
		onDragStart={handleDragStart}
		>
		<SortableContext
		items={tasks}
		strategy={verticalListSortingStrategy}
		>
		{tasks.length > 0 ? <Tasks tasks={tasks} highlightTask={highlightTask} deleteTask={deleteTask}/>: <div className="no-tasks">Empty Task List</div>}



		</SortableContext>
		</DndContext>

		</div>
		</>
	);
}
