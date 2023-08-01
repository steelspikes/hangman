import './ScreenModal.css';

export default function ScreenModal({
    show,
    children
}) {
    return <div className={"screen-modal"+(show ? " show" : " hide")}>
        {children}
    </div>
}